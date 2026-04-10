const mongoose = require('mongoose');

const courseProgress = mongoose.Schema({
    courseID:{
        type:mongoose.Schema.Types.ObjectId,
    },
});

module.exports = mongoose.model("courseProgress",courseProgress);