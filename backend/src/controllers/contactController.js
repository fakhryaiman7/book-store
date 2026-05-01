import { supabase } from "../config/supabase.js";
import sendEmail from "../utils/sendEmail.js";

// @desc    Send contact message to all admins
// @route   POST /api/contact
// @access  Public
const sendContactMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "Please provide all fields" });
  }

  try {
    // 1. Get all admin emails
    const { data: admins, error } = await supabase
      .from("users")
      .select("email")
      .eq("is_admin", true);

    if (error) {
      console.error("Error fetching admins:", error);
      return res.status(500).json({ message: "Failed to fetch admins" });
    }

    if (!admins || admins.length === 0) {
      return res.status(500).json({ message: "No admins found to receive messages" });
    }

    const adminEmails = admins.map((admin) => admin.email).join(", ");

    // 2. Prepare email content
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #6366f1; padding: 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0;">New Contact Message</h1>
        </div>
        <div style="padding: 30px;">
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 5px; margin-top: 20px;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>&copy; ${new Date().getFullYear()} BookVerse. This is an automated notification.</p>
        </div>
      </div>
    `;

    // 3. Send email
    await sendEmail({
      to: adminEmails,
      subject: `[Contact Form] ${subject}`,
      html: html,
    });

    res.status(200).json({ message: "Message sent successfully to all admins" });
  } catch (err) {
    console.error("CONTACT_ERROR:", err);
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

export { sendContactMessage };
