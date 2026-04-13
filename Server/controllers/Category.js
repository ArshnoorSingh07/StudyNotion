const Category = require('../models/Category');

// Handler function for createCategory
exports.createCategory = async(req, res) => {
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
        const categoryDetails = await Category.create(
            {
                name:name,
                description:description
            }
        )

        console.log("Category Details : ",categoryDetails);

        // return response
        return res.status(200).json({
            success:true,
            message:"Category created Successfully",
        });


    } catch(error) {
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
};

// getAllCategories Handler function
exports.showAllCategories = async(req, res) => {
    try{

        const allCategories = await Category.find({}, {name:true,description:true});

        return res.status(200).json({
            success:true,
            message:"All Categories returned successfully",
            allCategories,
        })

    } catch(error){
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }
};