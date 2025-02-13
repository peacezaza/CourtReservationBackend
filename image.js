const multer = require("multer");

const path = require("path");

// Set up storage
const storage = multer.diskStorage({
    destination: "uploads/", // Folder where files are saved
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName); // Save file with unique name + extension
    }
});


const upload = multer({ storage });

module.exports = {upload}
