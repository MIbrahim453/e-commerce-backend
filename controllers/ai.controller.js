import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Order from "../models/order.model.js";
import Review from "../models/review.model.js";
import User from "../models/user.model.js";
import { getGeminiClient, cleanJson, callGemini } from "../config/gemini.config.js";

export const generateProductListing = async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType = "image/jpeg", categoryHints = [] } = req.body;

    if (!prompt && !imageBase64) {
      return res.status(400).json({
        success: false,
        message: "Please provide either a product prompt/title or an uploaded image.",
      });
    }

    // Fetch existing categories from DB if not passed
    let categoriesList = categoryHints;
    if (!categoriesList || categoriesList.length === 0) {
      const dbCategories = await Category.find().select("name categoryCollection");
      categoriesList = dbCategories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        collection: c.categoryCollection,
      }));
    }

    const ai = getGeminiClient();

    if (!ai) {
      const baseTitle = prompt || "Classic Premium Slim-Fit Cotton Shirt";
      return res.status(200).json({
        success: true,
        isMock: true,
        warning: "GEMINI_API_KEY is not set in server/.env. Returning smart preview data. Add your free key to enable live AI vision generation.",
        data: {
          name: baseTitle,
          description: `Crafted from 100% premium long-staple cotton, this ${baseTitle.toLowerCase()} delivers unparalleled all-day breathability and a sharp, tailored silhouette. Designed with reinforced stitching, structured collar, and a modern drape that transitions effortlessly from boardroom presentations to weekend gatherings.`,
          price: 68.0,
          discount: 10,
          suggestedCategory: categoriesList[0]?.id || "",
          suggestedCategoryName: categoriesList[0]?.name || "Shirts",
          suggestedCollection: categoriesList[0]?.collection || "men",
          isTrending: true,
          isNewArrival: true,
          details: {
            material: "100% Combed Breathable Long-Staple Cotton",
            color: "Deep Ocean Navy",
            sizes: [
              { size: "S", stock: 15 },
              { size: "M", stock: 30 },
              { size: "L", stock: 25 },
              { size: "XL", stock: 10 },
            ],
            instructions: "Machine wash cold inside-out with like colors. Gentle cycle. Hang dry or tumble dry low. Warm iron if needed.",
          },
          marketingHighlights: [
            "Wrinkle-resistant luxury finish",
            "Tailored ergonomic cut for natural movement",
            "Sustainably sourced natural fibers",
          ],
        },
      });
    }

    const categoryNames = categoriesList.map((c) => `"${c.name}" (Collection: ${c.collection}, ID: ${c.id || c._id})`).join(", ");

    const systemPrompt = `You are an elite E-Commerce Fashion Catalog Specialist and Copywriter for a premium apparel brand.
Your job is to analyze the user's input (image and/or prompt) and generate a complete, high-converting product listing adhering strictly to this JSON structure:

{
  "name": "Catchy, professional product title (3-7 words, e.g., 'Classic Minimalist Linen Overshirt')",
  "description": "Engaging 2-3 paragraph marketing description highlighting fabric quality, tailored fit, versatility, and comfort.",
  "price": number (realistic retail price in USD, e.g. 59.00),
  "discount": number (launch discount percentage between 0 and 25, e.g. 10),
  "suggestedCategoryId": "The exact ID of the best matching category from this list, or empty string if none match",
  "suggestedCategoryName": "Category name chosen from list",
  "suggestedCollection": "men" | "women" | "kids",
  "isTrending": boolean,
  "isNewArrival": true,
  "details": {
    "material": "Specific luxury fabric composition (e.g. '100% Pure French Linen' or '95% Organic Cotton, 5% Elastane')",
    "color": "Specific aesthetic color name (e.g. 'Sage Green', 'Midnight Black', 'Oatmeal Melange')",
    "sizes": [
      { "size": "S", "stock": 15 },
      { "size": "M", "stock": 25 },
      { "size": "L", "stock": 20 },
      { "size": "XL", "stock": 10 }
    ],
    "instructions": "Professional fabric care instructions (wash temperature, ironing, drying)"
  },
  "marketingHighlights": [
    "Short 3-5 word bullet feature 1",
    "Short 3-5 word bullet feature 2",
    "Short 3-5 word bullet feature 3"
  ]
}

Available store categories: [${categoryNames}].
Match to one of the above categories if applicable.
Return ONLY valid raw JSON without markdown code fences.`;

    const contents = [];
    const parts = [{ text: systemPrompt }];

    if (prompt) {
      parts.push({ text: `User Prompt / Draft Title: "${prompt}"` });
    }

    if (imageBase64) {
      // Clean base64 string
      const cleanData = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType,
          data: cleanData,
        },
      });
    }

    contents.push({ role: "user", parts });

    const response = await callGemini(contents);

    const parsedData = cleanJson(response.text);

    return res.status(200).json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error("AI Generate Product Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate product details with AI.",
    });
  }
};

export const getInventoryAndPricingAdvice = async (req, res) => {
  try {
    const products = await Product.find().populate("category").lean();
    const orders = await Order.find().sort({ createdAt: -1 }).limit(150).lean();

    // Map order sales count per product
    const salesMap = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const id = item.productId?.toString();
        if (id) {
          salesMap[id] = (salesMap[id] || 0) + (Number(item.quantity) || 1);
        }
      });
    });

    // Compute inventory analytics
    const analyzedProducts = products.map((p) => {
      const totalStock = (p.details?.sizes || []).reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
      const unitsSold = salesMap[p._id.toString()] || 0;
      const price = Number(p.price) || 0;
      const currentDiscount = Number(p.discount) || 0;

      let status = "HEALTHY";
      if (totalStock === 0) status = "OUT_OF_STOCK";
      else if (totalStock < 10 && unitsSold > 5) status = "HIGH_DEMAND_LOW_STOCK";
      else if (totalStock > 40 && unitsSold <= 2) status = "SLOW_MOVING_OVERSTOCK";

      return {
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        category: p.category?.name || "General",
        collection: p.category?.categoryCollection || "all",
        thumbnail: p.thumbnail || (p.images && p.images[0]) || "",
        price,
        currentDiscount,
        totalStock,
        unitsSold,
        status,
      };
    });

    const slowMovers = analyzedProducts.filter((p) => p.status === "SLOW_MOVING_OVERSTOCK");
    const highDemand = analyzedProducts.filter((p) => p.status === "HIGH_DEMAND_LOW_STOCK");
    const outOfStock = analyzedProducts.filter((p) => p.status === "OUT_OF_STOCK");

    const ai = getGeminiClient();

    // If no AI key, return deterministic heuristic advice
    if (!ai) {
      const mockRecommendations = slowMovers.slice(0, 5).map((p) => {
        const targetDiscount = Math.min(35, Math.max(15, p.currentDiscount + 10));
        return {
          productId: p.id,
          productName: p.name,
          thumbnail: p.thumbnail,
          currentPrice: p.price,
          currentDiscount: p.currentDiscount,
          suggestedDiscount: targetDiscount,
          totalStock: p.totalStock,
          unitsSold: p.unitsSold,
          urgency: "HIGH",
          reason: `High inventory of ${p.totalStock} units with only ${p.unitsSold} sales in recent orders. A ${targetDiscount}% promotional discount will stimulate turnover.`,
          projectedImpact: `Expected to lift conversion by ~28% and free up working capital.`,
        };
      });

      return res.status(200).json({
        success: true,
        isMock: true,
        warning: "GEMINI_API_KEY is not set in server/.env. Using smart algorithmic calculations.",
        data: {
          summary: `Analyzed ${products.length} catalog items across ${orders.length} store orders. Found ${slowMovers.length} overstocked slow-moving items and ${highDemand.length} items at risk of running out.`,
          stats: {
            totalProducts: products.length,
            slowMovingCount: slowMovers.length,
            highDemandLowStockCount: highDemand.length,
            outOfStockCount: outOfStock.length,
          },
          recommendations: mockRecommendations,
          stockAlerts: highDemand.concat(outOfStock).slice(0, 5),
        },
      });
    }

    const promptContext = {
      totalProductsCount: products.length,
      sampleSlowMovers: slowMovers.slice(0, 8),
      sampleHighDemand: highDemand.slice(0, 8),
      outOfStockCount: outOfStock.length,
    };

    const prompt = `You are a Senior Retail Merchandise Planner & Pricing Strategist.
Analyze the following inventory and sales velocity data:
${JSON.stringify(promptContext, null, 2)}

Provide dynamic pricing and markdown recommendations to optimize revenue, clear stale stock, and protect profit margins.
Respond strictly in this JSON format:
{
  "summary": "Executive 2-sentence summary of store inventory health and pricing opportunities.",
  "recommendations": [
    {
      "productId": "id string",
      "productName": "product name",
      "thumbnail": "thumbnail string",
      "currentPrice": number,
      "currentDiscount": number,
      "suggestedDiscount": number (e.g. 15, 20, 25),
      "totalStock": number,
      "unitsSold": number,
      "urgency": "HIGH" | "MEDIUM" | "LOW",
      "reason": "Clear commercial reasoning for this discount adjustment",
      "projectedImpact": "Estimated impact on sales and revenue"
    }
  ],
  "strategicAdvice": [
    "Key actionable takeaway 1",
    "Key actionable takeaway 2",
    "Key actionable takeaway 3"
  ]
}

Return ONLY valid raw JSON.`;

    const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);

    const parsed = cleanJson(response.text);

    return res.status(200).json({
      success: true,
      data: {
        ...parsed,
        stats: {
          totalProducts: products.length,
          slowMovingCount: slowMovers.length,
          highDemandLowStockCount: highDemand.length,
          outOfStockCount: outOfStock.length,
        },
        stockAlerts: highDemand.concat(outOfStock).slice(0, 5),
      },
    });
  } catch (error) {
    console.error("AI Inventory & Pricing Advice Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate pricing advice.",
    });
  }
};

export const applyPricingRecommendation = async (req, res) => {
  try {
    const { productId, discount } = req.body;
    const numDiscount = Number(discount);

    if (!productId || isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
      return res.status(400).json({
        success: false,
        message: "Valid productId and discount between 0 and 100 are required.",
      });
    }

    const updated = await Product.findByIdAndUpdate(
      productId,
      { discount: numDiscount },
      { new: true }
    ).populate("category");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Discount successfully updated to ${numDiscount}% for ${updated.name}`,
      data: updated,
    });
  } catch (error) {
    console.error("Apply Discount Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to apply discount.",
    });
  }
};

export const askStoreAnalytics = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a query for store intelligence.",
      });
    }

    // Aggregate real store snapshot
    const [
      totalProducts,
      categories,
      orders,
      usersCount,
      reviews,
    ] = await Promise.all([
      Product.find().select("name price discount category details").lean(),
      Category.find().select("name categoryCollection").lean(),
      Order.find().sort({ createdAt: -1 }).limit(200).lean(),
      User.countDocuments({ role: "user" }),
      Review.find().select("rating review productId").lean(),
    ]);

    const paidOrders = orders.filter((o) => o.paymentStatus === "PAID");
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const orderStatusCounts = {
      PENDING: orders.filter((o) => o.orderStatus === "PENDING").length,
      CONFIRMED: orders.filter((o) => o.orderStatus === "CONFIRMED").length,
      SHIPPED: orders.filter((o) => o.orderStatus === "SHIPPED").length,
      DELIVERED: orders.filter((o) => o.orderStatus === "DELIVERED").length,
      CANCELLED: orders.filter((o) => o.orderStatus === "CANCELLED").length,
    };

    // Calculate product sales
    const productSalesMap = {};
    orders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const id = item.productId?.toString() || item.title;
        if (!productSalesMap[id]) {
          productSalesMap[id] = { title: item.title, count: 0, revenue: 0 };
        }
        productSalesMap[id].count += Number(item.quantity) || 1;
        productSalesMap[id].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const outOfStockProducts = totalProducts.filter((p) => {
      const stock = (p.details?.sizes || []).reduce((s, item) => s + (Number(item.stock) || 0), 0);
      return stock === 0;
    }).map((p) => p.name);

    const avgRating = reviews.length > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : "5.0";

    const storeSnapshot = {
      totalProductsCount: totalProducts.length,
      totalCategoriesCount: categories.length,
      totalCustomersCount: usersCount,
      totalOrdersCount: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
      averageOrderValue: orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : "0.00",
      orderStatusCounts,
      topSellingProducts,
      outOfStockSample: outOfStockProducts.slice(0, 5),
      customerReviewsCount: reviews.length,
      averageRating: avgRating,
    };

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        success: true,
        isMock: true,
        warning: "GEMINI_API_KEY is not set in server/.env. Generated from live database metrics.",
        data: {
          answer: `Store Overview for query: "${query}"\n\n• Total Revenue: $${storeSnapshot.totalRevenue} across ${orders.length} orders.\n• Active Orders: ${orderStatusCounts.PENDING + orderStatusCounts.CONFIRMED + orderStatusCounts.SHIPPED} awaiting fulfillment.\n• Top Performer: ${topSellingProducts[0]?.title || "Classic Cotton Shirt"} ($${topSellingProducts[0]?.revenue?.toFixed(2) || "0.00"}).\n• Inventory Status: ${outOfStockProducts.length} items currently out of stock.\n\nTip: Real-time database metrics loaded.`,
          keyMetrics: [
            { label: "Total Revenue", value: `$${storeSnapshot.totalRevenue}` },
            { label: "Total Orders", value: `${orders.length}` },
            { label: "Pending Shipments", value: `${orderStatusCounts.PENDING}` },
            { label: "Customer Rating", value: `⭐ ${avgRating} / 5` },
          ],
          recommendation: "Focus on restocking out-of-stock bestsellers and dispatching pending orders.",
        },
      });
    }

    const prompt = `You are a Senior E-Commerce Chief Operating Officer and Business Intelligence Analyst.
The merchant asks this business intelligence question about their store:
"${query}"

Here is the real-time store snapshot from their MongoDB database:
${JSON.stringify(storeSnapshot, null, 2)}

Provide a sharp, insightful, and professional response structured strictly as JSON:
{
  "answer": "Direct, clean executive answer. CRITICAL RULE: NEVER use asterisks (*) or markdown asterisks (like **bold** or *italic*) anywhere. Use clean sentences, plain text labels, and bullet dots (•) for lists.",
  "keyMetrics": [
    { "label": "Short label", "value": "Formatted value" }
  ],
  "recommendation": "1 proactive strategic business recommendation based on their data without any asterisks."
}

Return ONLY valid raw JSON.`;

    const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);

    const parsed = cleanJson(response.text);

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("Ask Store Analytics Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process analytics query.",
    });
  }
};

export const customerStylistChat = async (req, res) => {
  try {
    const { message: userMessage, history = [] } = req.body;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    // Check if the user is asking about an order
    const orderMatch = userMessage.match(/(?:ORD-[A-Za-z0-9]+|[a-f0-9]{24})/i);
    let matchedOrder = null;
    if (orderMatch) {
      const orderQuery = orderMatch[0];
      matchedOrder = await Order.findOne({
        $or: [{ orderNumber: orderQuery }, { _id: orderQuery.length === 24 ? orderQuery : null }],
      }).lean();
    }

    // Pull catalog items to provide realistic recommendations
    const catalog = await Product.find()
      .populate("category")
      .select("name slug price discount thumbnail images details category")
      .limit(30)
      .lean();

    const catalogSummary = catalog.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      price: p.price,
      discount: p.discount,
      category: p.category?.name || "Apparel",
      collection: p.category?.categoryCollection || "all",
      material: p.details?.material || "",
      color: p.details?.color || "",
      sizes: (p.details?.sizes || []).filter((s) => s.stock > 0).map((s) => s.size),
    }));

    const ai = getGeminiClient();

    if (!ai) {
      // Deterministic friendly fallback
      const recommended = catalog.slice(0, 2).map((p) => ({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        price: p.price,
        discount: p.discount,
        thumbnail: p.thumbnail || (p.images && p.images[0]) || "",
        category: p.category?.name || "Apparel",
      }));

      let reply = `Hello. I am AURA, your personal stylist and wardrobe advisor.\n\n`;
      if (matchedOrder) {
        reply += `I located your order #${matchedOrder.orderNumber}. Current status: ${matchedOrder.orderStatus} (Payment: ${matchedOrder.paymentStatus}). Total items: ${matchedOrder.items?.length || 0}.\n\n`;
      } else {
        reply += `Whether you are curating an outfit for an evening event, a casual weekend retreat, or seeking breathable fabrics, I am here to assist.\n\nHere are selected signature pieces from our current collection:`;
      }

      return res.status(200).json({
        success: true,
        isMock: true,
        warning: "Add GEMINI_API_KEY in server/.env for personalized generative styling advice.",
        data: {
          reply,
          recommendedProducts: recommended,
          orderInfo: matchedOrder ? {
            orderNumber: matchedOrder.orderNumber,
            status: matchedOrder.orderStatus,
            total: matchedOrder.total,
          } : null,
        },
      });
    }

    const systemPrompt = `You are AURA, an elite private client fashion stylist and personal shopper for this luxury boutique.
Your name is strictly AURA (always all-caps).

CRITICAL FORMATTING INSTRUCTIONS:
1. NEVER use any asterisks (*) or markdown asterisks (like **bold** or *italic*) anywhere in your response. Zero asterisks.
2. For lists or recommended items, use clean bullet dots like "• " or clean paragraph breaks.
3. Speak with effortless high-fashion authority, elegance, tailored precision, and warmth.
4. Only recommend products that exist in the catalog provided below.
5. When referring to products from the catalog, mention their exact names naturally.
6. If the customer provided an order number, state the order status cleanly without asterisks.

Store Catalog:
${JSON.stringify(catalogSummary, null, 2)}

${matchedOrder ? `ORDER FOUND IN DATABASE: Order Number: ${matchedOrder.orderNumber}, Status: ${matchedOrder.orderStatus}, Payment: ${matchedOrder.paymentStatus}, Total: $${matchedOrder.total}, Items: ${matchedOrder.items?.map(i => i.title).join(", ")}` : "No specific order requested."}

Respond strictly in this JSON format:
{
  "reply": "Your stylish conversational response in clean plain text without any asterisks (*)",
  "recommendedProductIds": ["id1", "id2"] // Array of up to 3 product IDs from the catalog that match the outfit recommendation
}

Return ONLY valid raw JSON.`;

    const chatContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
    ];

    // Append prior history
    (history || []).slice(-6).forEach((h) => {
      chatContents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      });
    });

    chatContents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const response = await callGemini(chatContents);

    const parsed = cleanJson(response.text);

    // Map recommended product IDs to full objects for frontend rendering
    const recIds = new Set(parsed.recommendedProductIds || []);
    const matchedProducts = catalog
      .filter((p) => recIds.has(p._id.toString()))
      .map((p) => ({
        id: p._id.toString(),
        name: p.name,
        slug: p.slug,
        price: p.price,
        discount: p.discount,
        thumbnail: p.thumbnail || (p.images && p.images[0]) || "",
        category: p.category?.name || "Apparel",
      }));

    return res.status(200).json({
      success: true,
      data: {
        reply: parsed.reply,
        recommendedProducts: matchedProducts,
        orderInfo: matchedOrder ? {
          orderNumber: matchedOrder.orderNumber,
          status: matchedOrder.orderStatus,
          total: matchedOrder.total,
        } : null,
      },
    });
  } catch (error) {
    console.error("AI Stylist Chat Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to chat with AI stylist.",
    });
  }
};
