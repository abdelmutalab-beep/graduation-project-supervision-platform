window.GPSP_API = (() => {
  const cfg = window.GPSP_CONFIG || {};
  async function request(action, params = {}) {
    if (!cfg.API_URL) throw new Error("API_URL_NOT_CONFIGURED");
    const url = new URL(cfg.API_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v ?? ""));
    const res = await fetch(url.toString(), {method:"GET", credentials:"omit"});
    if (!res.ok) throw new Error("HTTP_"+res.status);
    const data = await res.json();
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  return {
    dashboard: () => request("dashboard"),
    studentWorkspace: (studentId) => request("studentWorkspace",{studentId})
  };
})();
