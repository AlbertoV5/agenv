// src/cli/approve/utils.ts
function formatApprovalIcon(status) {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "revoked":
      return "REVOKED";
    default:
      return "PENDING";
  }
}
export {
  formatApprovalIcon
};
