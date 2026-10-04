import { Link, useSearchParams } from "react-router-dom";
import "../styles/ConfirmEmail.css";

function ConfirmEmail() {
  const [searchParams] =
    useSearchParams();

  const email =
    searchParams.get("email");

  return (
    <div className="confirm-email-page">
      <div className="confirm-email-card">

        <div className="confirm-email-icon">
          @
        </div>

        <h1>
          Check your email
        </h1>

        <p>
          We've sent a confirmation
          link to:
        </p>

        {email && (
          <strong>
            {email}
          </strong>
        )}

        <p>
          Please click the link in
          the email to activate your
          account.
        </p>

        <Link
          to="/login"
          className="confirm-email-button"
        >
          Go to Sign In
        </Link>

      </div>
    </div>
  );
}

export default ConfirmEmail;