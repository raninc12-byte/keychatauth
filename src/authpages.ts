/*
 * From Uiverse.io by JohnnyCSilva - https://uiverse.io/JohnnyCSilva/bad-cheetah-74
 * MIT License, Copyright (c) JohnnyCSilva (João Silva)
 *
 * DarkChat's sign-in and sign-up pages, built on that form. Classes are prefixed dc-auth-;
 * the layout, sizes, blue focus accent and hover/focus transitions are unchanged, recolored for dark mode.
 * These plug into OpenAuth's PasswordProvider as its `login` and `register` screens; the
 * password-reset screen still comes from OpenAuth's built-in PasswordUI.
 */
import type { PasswordLoginError, PasswordRegisterError, PasswordRegisterState } from "@openauthjs/openauth/provider/password";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const val = (form: FormData | undefined, name: string) => esc(form?.get(name)?.toString() ?? "");

const CSS = `
/* From Uiverse.io by JohnnyCSilva - https://uiverse.io/JohnnyCSilva/bad-cheetah-74
   MIT License, Copyright (c) JohnnyCSilva (João Silva) */
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:16px;background:#0d0d0f;color:#e8e6e3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif}
body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(120% 80% at 30% 0%,#1a1a1d 0%,#0d0d0f 60%)}
.dc-auth-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px}
.dc-auth-logo{width:30px;height:30px;display:block}

.dc-auth-form{display:flex;flex-direction:column;gap:10px;background-color:#161618;border:1px solid rgba(255,255,255,.08);padding:30px;width:450px;max-width:100%;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif}
.dc-auth-form ::placeholder{color:#6f6b66;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif}
.dc-auth-form button{align-self:flex-end}
.dc-auth-flex-column > label{color:#e8e6e3;font-weight:600}
.dc-auth-inputForm{border:1.5px solid #2a2a2e;border-radius:10px;height:50px;display:flex;align-items:center;padding-left:10px;transition:0.2s ease-in-out;background:#0f0f11}
.dc-auth-inputForm svg{fill:#a19d97;flex:none}
.dc-auth-input{margin-left:10px;border-radius:10px;border:none;width:100%;height:100%;font-size:15px;color:#e8e6e3;background:transparent}
.dc-auth-input:focus{outline:none}
.dc-auth-inputForm:focus-within{border:1.5px solid #2d79f3}
.dc-auth-flex-row{display:flex;flex-direction:row;align-items:center;gap:10px;justify-content:space-between}
.dc-auth-flex-row > div > label{font-size:14px;color:#e8e6e3;font-weight:400}
.dc-auth-span{font-size:14px;margin-left:5px;color:#5b9bff;font-weight:500;cursor:pointer;text-decoration:none}
.dc-auth-button-submit{margin:20px 0 10px 0;background-color:#e8e6e3;border:none;color:#151717;font-size:15px;font-weight:600;border-radius:10px;height:50px;width:100%;cursor:pointer}
.dc-auth-p{text-align:center;color:#c9c6c2;font-size:14px;margin:5px 0}
.dc-auth-btn{margin-top:10px;width:100%;height:50px;border-radius:10px;display:flex;justify-content:center;align-items:center;font-weight:500;gap:10px;border:1px solid #2a2a2e;background-color:#1d1d20;cursor:pointer;transition:0.2s ease-in-out;color:#e8e6e3;font-size:15px}
.dc-auth-apple{fill:#e8e6e3}
.dc-auth-btn:hover{border:1px solid #2d79f3}

/* DarkChat additions: errors, the code step, and the "coming soon" social buttons */
.dc-auth-error{margin:0 0 4px;padding:10px 12px;border-radius:10px;background:rgba(217,130,130,.12);border:1px solid rgba(217,130,130,.3);color:#f0a3a3;font-size:14px}
.dc-auth-hint{margin:0;color:#a19d97;font-size:14px}
.dc-auth-hint b{color:#e8e6e3}
.dc-auth-btn:disabled{cursor:not-allowed;opacity:.75}
.dc-auth-soon{font-size:11px;font-weight:600;color:#8a8680}
.dc-auth-remember{display:flex;align-items:center;gap:6px}
.dc-auth-remember input{margin:0;accent-color:#2d79f3}
@media (max-width:480px){.dc-auth-form{padding:22px}}
`;

const MAIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 32 32" height="20" aria-hidden="true"><g><path d="m30.853 13.87a15 15 0 0 0 -29.729 4.082 15.1 15.1 0 0 0 12.876 12.918 15.6 15.6 0 0 0 2.016.13 14.85 14.85 0 0 0 7.715-2.145 1 1 0 1 0 -1.031-1.711 13.007 13.007 0 1 1 5.458-6.529 2.149 2.149 0 0 1 -4.158-.759v-10.856a1 1 0 0 0 -2 0v1.726a8 8 0 1 0 .2 10.325 4.135 4.135 0 0 0 7.83.274 15.2 15.2 0 0 0 .823-7.455zm-14.853 8.13a6 6 0 1 1 6-6 6.006 6.006 0 0 1 -6 6z"></path></g></svg>`;
const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" viewBox="-64 0 512 512" height="20" aria-hidden="true"><path d="m336 512h-288c-26.453125 0-48-21.523438-48-48v-224c0-26.476562 21.546875-48 48-48h288c26.453125 0 48 21.523438 48 48v224c0 26.476562-21.546875 48-48 48zm-288-288c-8.8125 0-16 7.167969-16 16v224c0 8.832031 7.1875 16 16 16h288c8.8125 0 16-7.167969 16-16v-224c0-8.832031-7.1875-16-16-16zm0 0"></path><path d="m304 224c-8.832031 0-16-7.167969-16-16v-80c0-52.929688-43.070312-96-96-96s-96 43.070312-96 96v80c0 8.832031-7.167969 16-16 16s-16-7.167969-16-16v-80c0-70.59375 57.40625-128 128-128s128 57.40625 128 128v80c0 8.832031-7.167969 16-16 16zm0 0"></path></svg>`;
const GOOGLE_ICON = `<svg viewBox="0 0 512 512" width="20" aria-hidden="true"><path d="M113.47,309.408L95.648,375.94l-65.139,1.378C11.042,341.211,0,299.9,0,256c0-42.451,10.324-82.483,28.624-117.732h0.014l57.992,10.632l25.404,57.644c-5.317,15.501-8.215,32.141-8.215,49.456C103.821,274.792,107.225,292.797,113.47,309.408z" style="fill:#FBBB00;"></path><path d="M507.527,208.176C510.467,223.662,512,239.655,512,256c0,18.328-1.927,36.206-5.598,53.451c-12.462,58.683-45.025,109.925-90.134,146.187l-0.014-0.014l-73.044-3.727l-10.338-64.535c29.932-17.554,53.324-45.025,65.646-77.911h-136.89V208.176h138.887L507.527,208.176L507.527,208.176z" style="fill:#518EF8;"></path><path d="M416.253,455.624l0.014,0.014C372.396,490.901,316.666,512,256,512c-97.491,0-182.252-54.491-225.491-134.681l82.961-67.91c21.619,57.698,77.278,98.771,142.53,98.771c28.047,0,54.323-7.582,76.87-20.818L416.253,455.624z" style="fill:#28B446;"></path><path d="M419.404,58.936l-82.933,67.896c-23.335-14.586-50.919-23.012-80.471-23.012c-66.729,0-123.429,42.957-143.965,102.724l-83.397-68.276h-0.014C71.23,56.123,157.06,0,256,0C318.115,0,375.068,22.126,419.404,58.936z" style="fill:#F14336;"></path></svg>`;
const APPLE_ICON = `<svg class="dc-auth-apple" viewBox="0 0 22.773 22.773" width="20" height="20" aria-hidden="true"><g><path d="M15.769,0c0.053,0,0.106,0,0.162,0c0.13,1.606-0.483,2.806-1.228,3.675c-0.731,0.863-1.732,1.7-3.351,1.573c-0.108-1.583,0.506-2.694,1.25-3.561C13.292,0.879,14.557,0.16,15.769,0z"></path><path d="M20.67,16.716c0,0.016,0,0.03,0,0.045c-0.455,1.378-1.104,2.559-1.896,3.655c-0.723,0.995-1.609,2.334-3.191,2.334c-1.367,0-2.275-0.879-3.676-0.903c-1.482-0.024-2.297,0.735-3.652,0.926c-0.155,0-0.31,0-0.462,0c-0.995-0.144-1.798-0.932-2.383-1.642c-1.725-2.098-3.058-4.808-3.306-8.276c0-0.34,0-0.679,0-1.019c0.105-2.482,1.311-4.5,2.914-5.478c0.846-0.52,2.009-0.963,3.304-0.765c0.555,0.086,1.122,0.276,1.619,0.464c0.471,0.181,1.06,0.502,1.618,0.485c0.378-0.011,0.754-0.208,1.135-0.347c1.116-0.403,2.21-0.865,3.652-0.648c1.733,0.262,2.963,1.032,3.723,2.22c-1.466,0.933-2.625,2.339-2.427,4.74C17.818,14.688,19.086,15.964,20.67,16.716z"></path></g></svg>`;

function page(title: string, body: string, script = ""): Response {
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0d0d0f">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cpath fill='%23c9a46b' fill-rule='evenodd' d='M7 3h18a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H15l-6.2 4.6c-.7.5-1.8 0-1.8-.9V25a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm11.6 5.2a6.4 6.4 0 1 0 5.6 9.4 5.2 5.2 0 1 1-5.6-9.4z'/%3E%3C/svg%3E">
<title>${esc(title)} · DarkChat</title>
<style>${CSS}</style>
</head>
<body>
<div class="dc-auth-brand"><svg class="dc-auth-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#c9a46b" fill-rule="evenodd" d="M7 3h18a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H15l-6.2 4.6c-.7.5-1.8 0-1.8-.9V25a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm11.6 5.2a6.4 6.4 0 1 0 5.6 9.4 5.2 5.2 0 1 1-5.6-9.4z"/></svg>DarkChat</div>
${body}
${script ? `<script>${script}</script>` : ""}
</body>
</html>`;
	return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function field(id: string, label: string, icon: string, input: string): string {
	return `<div class="dc-auth-flex-column"><label for="${id}">${label}</label></div>
	<div class="dc-auth-inputForm">${icon}${input}</div>`;
}

function errorBox(message: string | null): string {
	return message ? `<p class="dc-auth-error" role="alert">${esc(message)}</p>` : "";
}

// Google and Apple sign-in aren't set up yet, so the buttons are shown but disabled.
const SOCIAL = `<p class="dc-auth-p">Or With <span class="dc-auth-soon">(coming soon)</span></p>
	<div class="dc-auth-flex-row">
		<button class="dc-auth-btn" type="button" disabled title="Google sign-in is coming soon">${GOOGLE_ICON} Google</button>
		<button class="dc-auth-btn" type="button" disabled title="Apple sign-in is coming soon">${APPLE_ICON} Apple</button>
	</div>`;

// Remembers the "Remember me" choice for the callback that finishes signing in (see /callback).
const REMEMBER_SCRIPT = `
document.querySelector(".dc-auth-form").addEventListener("submit", function () {
  var keep = document.getElementById("remember").checked ? "1" : "0";
  document.cookie = "kc_remember=" + keep + "; Path=/; Max-Age=600; SameSite=Lax; Secure";
});`;

export function loginPage(form?: FormData, error?: PasswordLoginError): Response {
	const message =
		error?.type === "invalid_password" ? "That password isn't right." : error?.type === "invalid_email" ? "No account uses that email." : null;
	return page(
		"Sign in",
		`<form class="dc-auth-form" method="post">
	${errorBox(message)}
	${field("email", "Email", MAIL_ICON, `<input id="email" name="email" placeholder="Enter your Email" class="dc-auth-input" type="email" autocomplete="email" required autofocus value="${val(form, "email")}">`)}
	${field("password", "Password", LOCK_ICON, `<input id="password" name="password" placeholder="Enter your Password" class="dc-auth-input" type="password" autocomplete="current-password" required>`)}
	<div class="dc-auth-flex-row">
		<div class="dc-auth-remember"><input type="checkbox" id="remember" checked><label for="remember">Remember me</label></div>
		<a class="dc-auth-span" href="change">Forgot password?</a>
	</div>
	<button class="dc-auth-button-submit" type="submit">Sign In</button>
	<p class="dc-auth-p">Don't have an account? <a class="dc-auth-span" href="register">Sign Up</a></p>
	${SOCIAL}
</form>`,
		REMEMBER_SCRIPT,
	);
}

export function registerPage(state: PasswordRegisterState, form?: FormData, error?: PasswordRegisterError): Response {
	const message =
		error?.type === "email_taken"
			? "An account already uses that email. Sign in instead."
			: error?.type === "invalid_email"
				? "Enter a valid email."
				: error?.type === "invalid_password"
					? "Enter a password."
					: error?.type === "password_mismatch"
						? "The passwords don't match."
						: error?.type === "validation_error"
							? (error.message ?? "That password isn't allowed.")
							: error?.type === "invalid_code"
								? "That code isn't right. Check it and try again."
								: null;

	if (state.type === "code") {
		return page(
			"Check your email",
			`<form class="dc-auth-form" method="post">
	<input type="hidden" name="action" value="verify">
	${errorBox(message)}
	<p class="dc-auth-hint">We sent a 6-digit code to <b>${esc(state.email)}</b>. Enter it to finish creating your account.</p>
	${field("code", "Code", MAIL_ICON, `<input id="code" name="code" placeholder="6-digit code" class="dc-auth-input" inputmode="numeric" autocomplete="one-time-code" minlength="6" maxlength="6" required autofocus>`)}
	<button class="dc-auth-button-submit" type="submit">Create account</button>
	<p class="dc-auth-p">Wrong email? <a class="dc-auth-span" href="register">Start again</a></p>
</form>`,
		);
	}

	const keep = error?.type !== "email_taken" && error?.type !== "invalid_email";
	return page(
		"Sign up",
		`<form class="dc-auth-form" method="post">
	<input type="hidden" name="action" value="register">
	${errorBox(message)}
	${field("email", "Email", MAIL_ICON, `<input id="email" name="email" placeholder="Enter your Email" class="dc-auth-input" type="email" autocomplete="email" required autofocus value="${keep ? val(form, "email") : ""}">`)}
	${field("password", "Password", LOCK_ICON, `<input id="password" name="password" placeholder="Choose a Password" class="dc-auth-input" type="password" autocomplete="new-password" required>`)}
	${field("repeat", "Repeat password", LOCK_ICON, `<input id="repeat" name="repeat" placeholder="Repeat your Password" class="dc-auth-input" type="password" autocomplete="new-password" required>`)}
	<button class="dc-auth-button-submit" type="submit">Sign Up</button>
	<p class="dc-auth-p">Already have an account? <a class="dc-auth-span" href="authorize">Sign In</a></p>
	${SOCIAL}
</form>`,
	);
}
