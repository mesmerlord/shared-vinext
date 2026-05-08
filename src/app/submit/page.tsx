import { SubmitClient } from "./submit-client";

export const metadata = {
  title: "Claim a project",
  description: "Get on the board. Drop a public GitHub repo URL and your homepage. We do the rest.",
};

export default function SubmitPage() {
  return <SubmitClient />;
}
