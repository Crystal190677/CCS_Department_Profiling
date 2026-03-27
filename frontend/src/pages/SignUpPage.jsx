import { Navigate } from 'react-router-dom';

/** Legacy route: open signup is disabled; students use claim flow. */
export default function SignUpPage() {
  return <Navigate to="/claim-account" replace />;
}
