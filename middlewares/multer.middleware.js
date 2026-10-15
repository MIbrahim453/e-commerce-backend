import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const uploadDir = "./public/temp";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
      if (err) return cb(err);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + raw.toString("hex") + ext);
    });
  },
});

export const upload = multer({ storage: storage });
