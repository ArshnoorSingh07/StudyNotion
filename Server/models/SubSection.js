const mongoose = require('mongoose');

const subSectionSchema = new mongoose.Schema({
    title:{
        type:String,
    },
    timeDuration:{
        type:String,
    },
    description:{
        type:String,
    },
    assistantNotes: {
        type: String,
        default: "",
        maxlength: 60000,
        select: false,
    },
    videoUrl:{
        type:String,
    }
});

module.exports = mongoose.model("SubSection",subSectionSchema);
