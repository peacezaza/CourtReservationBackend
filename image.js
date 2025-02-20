const multer = require("multer");
const path = require("path");
const fs = require('fs');

const { addStadiumPhoto } = require('./database')

// Set up storage
const storage = multer.diskStorage({
    destination: "uploads/", // Folder where files are saved
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Get file extension
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        cb(null, uniqueName); // Save file with unique name + extension
    }
});

async function saveStadiumPhotos(stadiumId, files) {
    try {
        const photoPaths = [];

        for (const file of files) {
            const ext = path.extname(file.originalname); // Get file extension
            const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            const filePath = path.join('uploads', uniqueName);  // or use full URL if needed
            photoPaths.push(filePath);  // Save the file path to the database
            await fs.promises.writeFile(filePath, file.buffer);
        }

        // console.log(photoPaths)

        if(photoPaths.length > 0){
            for(const photoPath of photoPaths){
                await addStadiumPhoto(stadiumId, photoPath)
            }
        }

        // console.log(`Photos saved for stadium ID: ${stadiumId}`);
    } catch (error) {
        console.error("Error saving stadium photos:", error);
    }
}

// const upload = multer({ storage });
// const upload = multer({ storage: multer.memoryStorage() });

// const uploadNone = multer()

const upload = multer({ storage: multer.memoryStorage() });

module.exports = { upload, saveStadiumPhotos }
