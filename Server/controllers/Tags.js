const Tag = require('../models/Tags');

// Handler function for createTag
exports.createTag = async(req, res) => {
    try{
        // fetch data
        const {name, description} = req.body;

        // validation of data
        if(!name || !description){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            })
        };

        // Create entry in db
        const tagDetails = await Tag.create(
            {
                name:name,
                description:description
            }
        )

        console.log("Tag Details : ",tagDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:"Tag created Successfully",
        });


    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
};

// getAllTags Handler function
exports.showAllTags = async(req, res) => {
    try{

        const allTags = await Tag.find({}, {name:true,description:true});

        return res.status(200).json({
            success:true,
            message:"All Tags returned successfully",
            allTags,
        })

    } catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
};