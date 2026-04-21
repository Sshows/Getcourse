import {
  loginStudentWithPassword,
  registerStudentAccount,
  resendStudentVerification,
  verifyStudentAccount
} from "@/lib/securecourse-store";
import {
  sendStudentEmailVerification,
  sendStudentSmsVerification
} from "@/lib/securecourse-notifications";

function buildRequestMetadata(request, body = {}) {
  return {
    ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    userAgent: body.userAgent || request.headers.get("user-agent") || null,
    deviceId: body.deviceId || "securecourse-web-password",
    deviceFingerprint: body.deviceFingerprint || "securecourse-web-password",
    deviceLabel: body.deviceLabel || "SecureCourse Website"
  };
}

function shapeVerificationDelivery(channelPayload, deliveryPayload) {
  if (!channelPayload) {
    return null;
  }

  return {
    maskedDestination: channelPayload.maskedDestination,
    expiresAt: channelPayload.expiresAt,
    deliveryMode: deliveryPayload.mode,
    delivered: deliveryPayload.delivered,
    previewCode: deliveryPayload.previewCode || null
  };
}

export async function beginStudentRegistration(request, body) {
  const payload = registerStudentAccount(body, buildRequestMetadata(request, body));
  const emailDelivery = await sendStudentEmailVerification({
    to: payload.verification.email.destination,
    fullName: payload.student.fullName,
    code: payload.verification.email.code
  });
  const smsDelivery = await sendStudentSmsVerification({
    phone: payload.verification.sms.destination,
    code: payload.verification.sms.code
  });

  return {
    student: payload.student,
    verification: {
      email: shapeVerificationDelivery(payload.verification.email, emailDelivery),
      sms: shapeVerificationDelivery(payload.verification.sms, smsDelivery)
    }
  };
}

export async function resendStudentRegistrationVerification(request, body) {
  const payload = resendStudentVerification(body, buildRequestMetadata(request, body));
  const emailDelivery = payload.verification.email
    ? await sendStudentEmailVerification({
        to: payload.verification.email.destination,
        fullName: payload.student.fullName,
        code: payload.verification.email.code
      })
    : null;
  const smsDelivery = payload.verification.sms
    ? await sendStudentSmsVerification({
        phone: payload.verification.sms.destination,
        code: payload.verification.sms.code
      })
    : null;

  return {
    student: payload.student,
    verification: {
      email: shapeVerificationDelivery(payload.verification.email, emailDelivery),
      sms: shapeVerificationDelivery(payload.verification.sms, smsDelivery)
    }
  };
}

export async function completeStudentRegistration(request, body) {
  return verifyStudentAccount(body, buildRequestMetadata(request, body));
}

export async function loginStudentOnWebsite(request, body) {
  return loginStudentWithPassword(body, buildRequestMetadata(request, body));
}
