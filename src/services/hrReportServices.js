import axios from "axios";
import { getAuthHeaders } from "./apiLogin";
import { getServicesUrl, url_api_services } from "./url";

const getHrReportUrl = () => {
  const servicesUrl = getServicesUrl?.() || url_api_services;
  return servicesUrl.replace(/\/index\.php(\?.*)?$/, "/hr_reports.php");
};

export async function runHrReport(payload) {
  const headers = await getAuthHeaders();
  const response = await axios.post(getHrReportUrl(), payload, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 120000,
  });

  return response.data;
}

export function downloadHrReportFile(result) {
  if (!result?.contentBase64) {
    return false;
  }

  const binary = window.atob(result.contentBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type: result.mime || "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename || "bao-cao";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}
