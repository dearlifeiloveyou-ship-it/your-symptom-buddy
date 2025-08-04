import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();
    console.log('Sending welcome email to:', email);

    const emailResponse = await resend.emails.send({
      from: "MDSDR Health <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to MDSDR - Your Health Journey Starts Here",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Welcome to MDSDR Health!</h1>
          
          <p>Hi ${name || 'there'},</p>
          
          <p>Thank you for joining MDSDR Health! We're excited to help you on your health journey.</p>
          
          <h2 style="color: #1e40af;">What you can do now:</h2>
          <ul>
            <li>✅ Check your symptoms with our AI-powered triage system</li>
            <li>✅ Get personalized health recommendations</li>
            <li>✅ Track your health over time</li>
            <li>✅ Download detailed PDF reports</li>
          </ul>
          
          <h2 style="color: #1e40af;">Free Plan Includes:</h2>
          <ul>
            <li>3 symptom checks per month</li>
            <li>Basic health recommendations</li>
            <li>Simple PDF reports</li>
          </ul>
          
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h3 style="color: white; margin: 0;">🎉 Special Offer</h3>
            <p style="color: white; margin: 10px 0;">Upgrade to Premium for just $9.99/month and get:</p>
            <ul style="color: white; text-align: left; display: inline-block;">
              <li>Unlimited symptom checks</li>
              <li>Detailed PDF health reports</li>
              <li>Symptom tracking history & trends</li>
              <li>Priority support</li>
              <li>Family member profiles</li>
              <li>Export data to your doctor</li>
            </ul>
          </div>
          
          <p>Ready to get started? <a href="${req.headers.get("origin") || "https://your-domain.com"}" style="color: #2563eb;">Visit your dashboard</a> and begin your first symptom check!</p>
          
          <p>If you have any questions, our support team is here to help.</p>
          
          <p>Best regards,<br>The MDSDR Health Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);