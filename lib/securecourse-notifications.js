function canUseResend() {
  return Boolean(process.env.RESEND_API_KEY && process.env.SECURECOURSE_EMAIL_FROM);
}

function canUseTwilio() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
  );
}

function allowPreviewCodes() {
  return process.env.SECURECOURSE_ALLOW_PREVIEW_CODES !== "false";
}

export async function sendStudentEmailVerification(input) {
  const { to, fullName, code } = input;

  if (canUseResend()) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.SECURECOURSE_EMAIL_FROM,
        to: [to],
        subject: "SecureCourse: confirm your email",
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 12px">SecureCourse</h2>
            <p style="margin:0 0 12px">Hello${fullName ? `, ${fullName}` : ""}.</p>
            <p style="margin:0 0 12px">Use this code to verify your email on SecureCourse:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</div>
            <p style="margin:0;color:#475569">The code expires in 15 minutes.</p>
          </div>
        `
      })
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`Email delivery failed: ${payload}`);
    }

    const payload = await response.json();
    return {
      channel: "EMAIL",
      delivered: true,
      mode: "resend",
      providerMessageId: payload.id || null
    };
  }

  return {
    channel: "EMAIL",
    delivered: false,
    mode: "preview",
    previewCode: allowPreviewCodes() ? code : null
  };
}

export async function sendStudentSmsVerification(input) {
  const { phone, code } = input;

  if (canUseTwilio()) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const body = new URLSearchParams({
      To: phone,
      From: process.env.TWILIO_FROM_NUMBER,
      Body: `SecureCourse code: ${code}. It expires in 15 minutes.`
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`SMS delivery failed: ${payload}`);
    }

    const payload = await response.json();
    return {
      channel: "SMS",
      delivered: true,
      mode: "twilio",
      providerMessageId: payload.sid || null
    };
  }

  return {
    channel: "SMS",
    delivered: false,
    mode: "preview",
    previewCode: allowPreviewCodes() ? code : null
  };
}
