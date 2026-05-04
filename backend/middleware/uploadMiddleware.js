const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'incidents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const kennisbankDir = path.join(__dirname, '..', 'uploads', 'kennisbank');
if (!fs.existsSync(kennisbankDir)) {
  fs.mkdirSync(kennisbankDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Bestandstype niet toegestaan. Alleen afbeeldingen, PDF en Word documenten zijn toegestaan.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5 // Maximum 5 files per request
  }
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uid = req.params.id ?? 'x';
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
      ? ext
      : '.jpg';
    cb(null, `user_${uid}_${Date.now()}${safeExt}`);
  }
});

const avatarFileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  const ext = path.extname(file.originalname || '').toLowerCase();
  const extOk = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext);
  if (
    extOk &&
    (!file.mimetype || file.mimetype === 'application/octet-stream')
  ) {
    cb(null, true);
    return;
  }
  cb(new Error('Alleen afbeeldingen toegestaan (JPEG, PNG, GIF, WebP, HEIC/HEIF).'), false);
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const kbStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, kennisbankDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'].includes(ext)
      ? ext
      : '.jpg';
    cb(null, `kb_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const kbUpload = multer({
  storage: kbStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = {
  uploadIncidentAttachments: upload.array('attachments', 5), // Allow up to 5 files
  uploadUserAvatar: uploadAvatar.single('avatar'),
  uploadKnowledgeCover: kbUpload.single('cover'),
  uploadsDir,
  avatarsDir,
  kennisbankDir
}; 