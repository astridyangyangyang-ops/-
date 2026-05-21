import { Router, Request } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

const router = Router()

const uploadsDir = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuid()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
})

router.post('/', upload.single('file'), (req: Request, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file uploaded' })
  res.json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  })
})

export default router
