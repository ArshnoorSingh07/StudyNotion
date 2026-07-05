const axios = require("axios");
require("dotenv").config();

const mailSender = async (email, title, body) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: process.env.BREVO_SENDER_NAME,
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [
          {
            email,
          },
        ],
        subject: title,
        htmlContent: body,
      },
      {
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
      }
    );

    console.log("✅ Email sent successfully");
    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(
      "❌ Brevo Error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = mailSender;