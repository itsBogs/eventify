import multer from 'multer';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => { if (!allowed.has(file.mimetype)) { const error = new Error('Upload a JPG, PNG, or WEBP image.'); error.status = 415; return callback(error); } return callback(null, true); },
});

