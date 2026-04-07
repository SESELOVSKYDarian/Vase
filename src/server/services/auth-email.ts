type AuthEmailPayload = {
  email: string;
  subject: string;
  actionUrl: string;
};

export async function sendAuthEmail(payload: AuthEmailPayload) {
  // Placeholder transactional transport. In development we expose the link in server logs
  // so the auth flows remain testable without wiring an email provider yet.
  console.info(
    `[auth-email] to=${payload.email} subject="${payload.subject}" url=${payload.actionUrl}`,
  );
}
