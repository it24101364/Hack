import { startTransition, useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const emptyForm = {
  fullName: "",
  studentId: "",
  email: "",
  password: "",
  confirmPassword: "",
};
const emptyComplaint = {
  title: "",
  category: "",
  description: "",
  priority: "Medium",
};
const categories = [
  "Academic",
  "Hostel",
  "Facilities",
  "Library",
  "Transport",
  "Finance",
  "IT Services",
  "Other",
];
const statuses = ["Pending", "Under Review", "Resolved"];
const adminStatuses = ["Pending", "Under Review", "Resolved"];

const routeFromPath = () => {
  if (window.location.pathname.startsWith("/admin")) {
    const id = window.location.pathname.match(
      /^\/admin\/complaints\/([^/]+)$/,
    )?.[1];
    return { page: id ? "admin-detail" : "admin", id: id || null };
  }
  const match = window.location.pathname.match(
    /^\/student\/complaints(?:\/([^/]+))?$/,
  );
  return match
    ? match[1]
      ? { page: "detail", id: match[1] }
      : { page: "complaints", id: null }
    : { page: "dashboard", id: null };
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const displayStatus = (status) => status === "Closed" ? "Rejected" : status

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
      />
    </label>
  );
}

function App() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(() => routeFromPath().page);
  const [selectedComplaintId, setSelectedComplaintId] = useState(
    () => routeFromPath().id,
  );
  const [complaint, setComplaint] = useState(emptyComplaint);
  const [complaints, setComplaints] = useState([]);
  const [complaintDetails, setComplaintDetails] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [adminFilters, setAdminFilters] = useState({
    search: "",
    status: "",
    category: "",
    priority: "",
  });
  const [adminDetails, setAdminDetails] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const sessionRequest = useRef(0);
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("studentUser") || "null"),
  );

  useEffect(() => {
    if (user) localStorage.setItem("studentUser", JSON.stringify(user));
    else localStorage.removeItem("studentUser");
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    const requestId = ++sessionRequest.current;
    const storedUser = JSON.parse(
      localStorage.getItem("studentUser") || "null",
    );
    const sessionPath =
      storedUser?.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
    axios
      .get(`${API_URL}${sessionPath}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (requestId !== sessionRequest.current) return;
        const authenticatedUser = data.user || storedUser;
        setUser(authenticatedUser);
        if (authenticatedUser?.role === "admin") {
          window.history.replaceState({}, "", "/admin");
          setPage("admin");
        }
      })
      .catch(() => {
        if (requestId !== sessionRequest.current) return;
        localStorage.removeItem("authToken");
        setUser(null);
      });
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      const route = routeFromPath();
      setPage(route.page);
      setSelectedComplaintId(route.id);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (!user || page !== "complaints") return;
    startTransition(() => setTrackingLoading(true));
    axios
      .get(`${API_URL}/complaints/my`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      })
      .then(({ data }) => setComplaints(data.complaints))
      .catch((error) => handleTrackingError(error))
      .finally(() => setTrackingLoading(false));
  }, [user, page]);

  useEffect(() => {
    if (!user || page !== "detail" || !selectedComplaintId) return;
    const refresh = () =>
      axios
        .get(`${API_URL}/complaints/${selectedComplaintId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        })
        .then(({ data }) => setComplaintDetails(data.complaint))
        .catch((error) => handleTrackingError(error));
    startTransition(() => {
      setTrackingLoading(true);
      setComplaintDetails(null);
    });
    refresh().finally(() => setTrackingLoading(false));
    const refreshTimer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(refreshTimer);
  }, [user, page, selectedComplaintId]);

  useEffect(() => {
    if (!user || user.role !== "admin" || page !== "admin") return;
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    };
    startTransition(() => setAdminLoading(true));
    Promise.all([
      axios.get(`${API_URL}/admin/dashboard`, { headers }),
      axios.get(`${API_URL}/admin/complaints`, {
        headers,
        params: adminFilters,
      }),
    ])
      .then(([statsResponse, complaintsResponse]) => {
        setAdminStats(statsResponse.data.statistics);
        setAdminComplaints(complaintsResponse.data.complaints);
      })
      .catch((error) => handleAdminError(error))
      .finally(() => setAdminLoading(false));
  }, [user, page, adminFilters]);

  useEffect(() => {
    if (
      !user ||
      user.role !== "admin" ||
      page !== "admin-detail" ||
      !selectedComplaintId
    )
      return;
    startTransition(() => setAdminLoading(true));
    axios
      .get(`${API_URL}/admin/complaints/${selectedComplaintId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      })
      .then(({ data }) => {
        setAdminDetails(data.complaint);
        setAdminResponse(data.complaint.adminResponse || "");
      })
      .catch((error) => handleAdminError(error))
      .finally(() => setAdminLoading(false));
  }, [user, page, selectedComplaintId]);

  useEffect(() => {
    if (
      user &&
      user.role !== "admin" &&
      (page === "admin" || page === "admin-detail")
    )
      navigateTo("dashboard");
  }, [user, page]);

  const isLogin = mode === "login" || mode === "adminLogin";
  const isAdminLogin = mode === "adminLogin";

  const updateField = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setMessage(null);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setForm(emptyForm);
    setMessage(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    ++sessionRequest.current;

    if (!isLogin && form.password !== form.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (form.password.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const { data } = await axios.post(
        `${API_URL}${endpoint}`,
        isLogin ? { email: form.email, password: form.password } : form,
      );
      localStorage.setItem("authToken", data.token);
      if (isAdminLogin && data.user.role !== "admin") {
        localStorage.removeItem("authToken");
        setMessage({
          type: "error",
          text: "Administrator access is required.",
        });
        return;
      }
      const sessionPath =
        data.user.role === "admin" ? "/admin/dashboard" : "/student/dashboard";
      const dashboard = await axios.get(`${API_URL}${sessionPath}`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const authenticatedUser = dashboard.data.user || data.user;
      setUser(authenticatedUser);
      if (authenticatedUser.role === "admin") {
        window.history.replaceState({}, "", "/admin");
        setPage("admin");
      } else {
        window.history.replaceState({}, "", "/");
        setPage("dashboard");
      }
      setMessage({
        type: "success",
        text: isLogin
          ? "Welcome back. Your dashboard is ready."
          : "Account created successfully.",
      });
      setForm(emptyForm);
    } catch (error) {
      const apiMessage =
        error.response?.data?.message ||
        (isAdminLogin
          ? "We could not sign in as administrator. Please try again."
          : "We could not connect to the service. Please try again.");
      setMessage({ type: "error", text: apiMessage });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    setMode("login");
    setMessage({ type: "success", text: "You have been logged out." });
  };

  function navigateTo(nextPage, id = null) {
    const path =
      nextPage === "admin-detail"
        ? `/admin/complaints/${id}`
        : nextPage === "admin"
          ? "/admin"
          : nextPage === "detail"
            ? `/student/complaints/${id}`
            : nextPage === "complaints"
              ? "/student/complaints"
              : "/";
    window.history.pushState({}, "", path);
    setPage(nextPage);
    setSelectedComplaintId(id);
    setMessage(null);
  }

  function handleTrackingError(error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("authToken");
      setUser(null);
      setMessage({
        type: "error",
        text: "Your session has expired. Please sign in again.",
      });
    } else {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "We could not load your complaints. Please try again.",
      });
    }
  }

  function handleAdminError(error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem("authToken");
      setUser(null);
      setMessage({
        type: "error",
        text:
          error.response.status === 403
            ? "Administrator access is required."
            : "Your session has expired. Please sign in again.",
      });
    } else
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "We could not load the admin dashboard.",
      });
  }

  const updateAdminComplaint = async (field, value) => {
    if (!adminDetails || adminSaving) return;
    setAdminSaving(true);
    setMessage(null);
    try {
      const endpoint = field === "status" ? "status" : "response";
      const payload =
        field === "status" ? { status: value } : { response: value };
      const { data } = await axios.patch(
        `${API_URL}/admin/complaints/${adminDetails._id}/${endpoint}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        },
      );
      setAdminDetails({ ...adminDetails, ...data.complaint });
      setAdminResponse(data.complaint.adminResponse || "");
      setMessage({
        type: "success",
        text:
          field === "status" ? "Complaint status updated." : "Response saved.",
      });
    } catch (error) {
      handleAdminError(error);
    } finally {
      setAdminSaving(false);
    }
  };

  const rejectComplaint = () => {
    if (
      window.confirm(
        "Reject this complaint? It will be closed and the student will see it as rejected.",
      )
    )
      updateAdminComplaint("status", "Closed");
  };

  const updateComplaint = (event) => {
    setComplaint({ ...complaint, [event.target.name]: event.target.value });
    setMessage(null);
  };

  const submitComplaint = async (event) => {
    event.preventDefault();
    setMessage(null);
    if (
      !complaint.title.trim() ||
      !complaint.category ||
      !complaint.description.trim()
    ) {
      setMessage({
        type: "error",
        text: "Please complete all complaint fields.",
      });
      return;
    }
    if (complaint.title.trim().length < 3) {
      setMessage({
        type: "error",
        text: "Complaint title must be at least 3 characters.",
      });
      return;
    }
    if (complaint.description.trim().length < 10) {
      setMessage({
        type: "error",
        text: "Description must be at least 10 characters.",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(`${API_URL}/complaints`, complaint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComplaint(emptyComplaint);
      setPage("complaints");
      setMessage({ type: "success", text: "Complaint submitted successfully" });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("authToken");
        setUser(null);
        setMessage({
          type: "error",
          text: "Your session has expired. Please sign in again.",
        });
      } else {
        setMessage({
          type: "error",
          text:
            error.response?.data?.message ||
            "We could not submit your complaint. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    if (user.role === "admin") {
      return (
        <main className="app-shell dashboard-shell admin-shell">
          <header className="topbar">
            <div className="brand">
              <span className="brand-mark">SC</span>
              <span>Student Care</span>
            </div>
            <nav className="dashboard-nav">
              <button
                className={page === "admin" ? "nav-active" : ""}
                onClick={() => navigateTo("admin")}
              >
                Overview
              </button>
              <button className={page === "admin-detail" ? "nav-active" : ""}>
                Complaint detail
              </button>
              <button className="text-button" onClick={logout}>
                Log out
              </button>
            </nav>
          </header>
          {page === "admin" && (
            <section className="admin-content">
              <div className="admin-heading">
                <div>
                  <p className="eyebrow">Administrator portal</p>
                  <h1>Complaint desk.</h1>
                  <p className="dashboard-copy">
                    Review student concerns, keep statuses current, and close
                    the loop with thoughtful responses.
                  </p>
                </div>
                <span className="admin-chip">ADMIN ACCESS</span>
              </div>
              {message && (
                <div className={`message ${message.type}`} role="alert">
                  {message.text}
                </div>
              )}
              <div className="stat-grid">
                {[
                  ["Total complaints", adminStats?.total, "total"],
                  ["Pending", adminStats?.pending, "pending"],
                  ["Under review", adminStats?.underReview, "under-review"],
                  ["Resolved", adminStats?.resolved, "resolved"],
                  ["Rejected", adminStats?.closed, "rejected"],
                ].map(([label, value, tone]) => (
                  <div className={`stat-card stat-${tone}`} key={label}>
                    <span>{label}</span>
                    <strong>
                      {adminLoading && !adminStats ? "—" : (value ?? 0)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="admin-toolbar">
                <input
                  value={adminFilters.search}
                  onChange={(event) =>
                    setAdminFilters({
                      ...adminFilters,
                      search: event.target.value,
                    })
                  }
                  placeholder="Search title, student, ID, or email"
                  aria-label="Search complaints"
                />
                <select
                  value={adminFilters.status}
                  onChange={(event) =>
                    setAdminFilters({
                      ...adminFilters,
                      status: event.target.value,
                    })
                  }
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                      {adminStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <select
                  value={adminFilters.category}
                  onChange={(event) =>
                    setAdminFilters({
                      ...adminFilters,
                      category: event.target.value,
                    })
                  }
                  aria-label="Filter by category"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={adminFilters.priority}
                  onChange={(event) =>
                    setAdminFilters({
                      ...adminFilters,
                      priority: event.target.value,
                    })
                  }
                  aria-label="Filter by priority"
                >
                  <option value="">All priorities</option>
                  {["Low", "Medium", "High"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              {adminLoading && !adminComplaints.length ? (
                <div className="state-message">Loading complaints...</div>
              ) : adminComplaints.length === 0 ? (
                <div className="empty-state">
                  <strong>No complaints match these filters</strong>
                  <span>
                    Try clearing a filter or searching for another student.
                  </span>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Complaint</th>
                        <th>Category</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {adminComplaints.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <strong>
                              {item.student?.fullName || "Unknown student"}
                            </strong>
                            <small>
                              {item.student?.studentId}
                              <br />
                              {item.student?.email}
                            </small>
                          </td>
                          <td>{item.title}</td>
                          <td>{item.category}</td>
                          <td>{item.priority}</td>
                          <td>
                            <span
                              className={`status-badge status-${item.status.toLowerCase().replace(" ", "-")}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>{formatDate(item.createdAt)}</td>
                          <td>
                            <button
                              className="details-button"
                              onClick={() =>
                                navigateTo("admin-detail", item._id)
                              }
                            >
                              View <span aria-hidden="true">→</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {page === "admin-detail" && (
            <section className="admin-content">
              <button
                className="back-button"
                onClick={() => navigateTo("admin")}
              >
                ← Back to complaints
              </button>
              {adminLoading && !adminDetails ? (
                <div className="state-message">
                  Loading complaint details...
                </div>
              ) : adminDetails ? (
                <>
                  <div className="admin-detail-header">
                    <div>
                      <p className="eyebrow">
                        Complaint #{adminDetails._id.slice(-8).toUpperCase()}
                      </p>
                      <h1>{adminDetails.title}</h1>
                    </div>
                    <span
                      className={`status-badge status-${adminDetails.status.toLowerCase().replace(" ", "-")}`}
                    >
                      {adminDetails.status}
                    </span>
                  </div>
                  <div className="admin-detail-layout">
                    <div>
                      <div className="admin-info-block">
                        <span className="summary-label">
                          Student information
                        </span>
                        <strong>{adminDetails.student?.fullName}</strong>
                        <span>{adminDetails.student?.studentId}</span>
                        <span>{adminDetails.student?.email}</span>
                      </div>
                      <div className="admin-info-block">
                        <span className="summary-label">
                          Complaint information
                        </span>
                        <span>
                          {adminDetails.category} · {adminDetails.priority}{" "}
                          priority
                        </span>
                        <span>
                          Submitted {formatDate(adminDetails.createdAt)}
                        </span>
                        <span>
                          Updated {formatDate(adminDetails.updatedAt)}
                        </span>
                      </div>
                      <div className="detail-section">
                        <span className="summary-label">Description</span>
                        <p>{adminDetails.description}</p>
                      </div>
                    </div>
                    <aside className="admin-controls">
                      <label className="field">
                        <span>Update status</span>
                        <select
                          value={adminStatuses.includes(adminDetails.status) ? adminDetails.status : "Resolved"}
                          disabled={adminLoading || adminSaving}
                          onChange={(event) =>
                            updateAdminComplaint("status", event.target.value)
                          }
                        >
                          {adminStatuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="reject-button"
                        type="button"
                        disabled={
                          adminLoading ||
                          adminSaving ||
                          adminDetails.status === "Closed"
                        }
                        onClick={rejectComplaint}
                      >
                        Reject complaint
                      </button>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          updateAdminComplaint("response", adminResponse);
                        }}
                      >
                        <label className="field">
                          <span>Response to student</span>
                          <textarea
                            value={adminResponse}
                            disabled={adminLoading || adminSaving}
                            onChange={(event) =>
                              setAdminResponse(event.target.value)
                            }
                            placeholder="Write a response..."
                            rows="7"
                            maxLength="5000"
                          />
                        </label>
                        <button
                          className="primary-button"
                          type="submit"
                          disabled={adminLoading || adminSaving}
                        >
                          {adminSaving ? "Saving..." : "Save response"}
                          <span aria-hidden="true">→</span>
                        </button>
                      </form>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="state-message error-state">
                  Complaint not found.
                </div>
              )}
            </section>
          )}
        </main>
      );
    }
    return (
      <main className="app-shell dashboard-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">SC</span>
            <span>Student Care</span>
          </div>
          <nav className="dashboard-nav">
            <button
              className={page === "dashboard" ? "nav-active" : ""}
              onClick={() => navigateTo("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={
                page === "complaints" || page === "detail" ? "nav-active" : ""
              }
              onClick={() => navigateTo("complaints")}
            >
              My Complaints
            </button>
            <button className="text-button" onClick={logout}>
              Log out
            </button>
          </nav>
        </header>
        {page === "dashboard" && (
          <section className="dashboard-content">
            <p className="eyebrow">Student portal</p>
            <h1>Good to see you, {user.fullName.split(" ")[0]}.</h1>
            <p className="dashboard-copy">
              Your student account is secure and ready. When something needs
              attention, start a complaint and keep your voice moving forward.
            </p>
            <div className="account-summary">
              <span className="summary-label">Signed in as</span>
              <strong>{user.email}</strong>
              <span className="student-chip">
                Student ID · {user.studentId}
              </span>
            </div>
            <button
              className="primary-button dashboard-action"
              onClick={() => {
                setPage("submit");
                setMessage(null);
              }}
            >
              Submit a complaint <span aria-hidden="true">→</span>
            </button>
          </section>
        )}
        {page === "submit" && (
          <section className="dashboard-content complaint-page">
            <p className="eyebrow">Student portal / New complaint</p>
            <h1>Tell us what needs attention.</h1>
            <p className="dashboard-copy">
              Share the details below. Your complaint will be sent securely to
              the institution.
            </p>
            {message && (
              <div className={`message ${message.type}`} role="alert">
                {message.text}
              </div>
            )}
            <form className="complaint-form" onSubmit={submitComplaint}>
              <label className="field">
                <span>Complaint title</span>
                <input
                  name="title"
                  value={complaint.title}
                  onChange={updateComplaint}
                  placeholder="Summarize the issue"
                  required
                />
              </label>
              <label className="field">
                <span>Category</span>
                <select
                  name="category"
                  value={complaint.category}
                  onChange={updateComplaint}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  name="description"
                  value={complaint.description}
                  onChange={updateComplaint}
                  placeholder="Describe what happened and how it affects you"
                  rows="6"
                  required
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <select
                  name="priority"
                  value={complaint.priority}
                  onChange={updateComplaint}
                  required
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  disabled={loading}
                  onClick={() => {
                    setComplaint(emptyComplaint);
                    setMessage(null);
                    setPage("complaints");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit complaint"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          </section>
        )}
        {page === "complaints" && (
          <section className="dashboard-content tracking-page">
            <p className="eyebrow">Student portal / My complaints</p>
            <div className="page-heading-row">
              <div>
                <h1>My complaints.</h1>
                <p className="dashboard-copy">
                  A private record of the concerns you have raised.
                </p>
              </div>
              <button
                className="primary-button compact-button"
                onClick={() => {
                  setPage("submit");
                  setMessage(null);
                }}
              >
                New complaint <span aria-hidden="true">→</span>
              </button>
            </div>
            {message && (
              <div className={`message ${message.type}`} role="alert">
                {message.text}
              </div>
            )}
            {trackingLoading ? (
              <div className="state-message">Loading your complaints...</div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <strong>No complaints yet</strong>
                <span>
                  When you need help, submit your first complaint and it will
                  appear here.
                </span>
                <button
                  className="primary-button dashboard-action"
                  onClick={() => {
                    setPage("submit");
                    setMessage(null);
                  }}
                >
                  Submit a complaint <span aria-hidden="true">→</span>
                </button>
              </div>
            ) : (
              <div className="complaint-list">
                {complaints.map((item) => (
                  <article className="complaint-card" key={item._id}>
                    <div className="complaint-card-top">
                      <span className="complaint-id">
                        #{item._id.slice(-8).toUpperCase()}
                      </span>
                      <span
                        className={`status-badge status-${displayStatus(item.status).toLowerCase().replace(" ", "-")}`}
                      >
                        {displayStatus(item.status)}
                      </span>
                    </div>
                    <h3>{item.title}</h3>
                    <div className="complaint-meta">
                      <span>{item.category}</span>
                      <span>{item.priority} priority</span>
                      <span>Submitted {formatDate(item.createdAt)}</span>
                    </div>
                    <button
                      className="details-button"
                      onClick={() => navigateTo("detail", item._id)}
                    >
                      View details <span aria-hidden="true">→</span>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        {page === "detail" && (
          <section className="dashboard-content tracking-page">
            <div className="detail-actions">
              <button
                className="back-button"
                onClick={() => navigateTo("complaints")}
              >
                ← Back to My Complaints
              </button>
              <span className="live-label">Updates automatically</span>
            </div>
            {trackingLoading ? (
              <div className="state-message">Loading complaint details...</div>
            ) : complaintDetails ? (
              <>
                <div className="detail-heading">
                  <p className="eyebrow">
                    Complaint #{complaintDetails._id.slice(-8).toUpperCase()}
                  </p>
                  <h1>{complaintDetails.title}</h1>
                  <span
                    className={`status-badge status-${displayStatus(complaintDetails.status).toLowerCase().replace(" ", "-")}`}
                  >
                    {displayStatus(complaintDetails.status)}
                  </span>
                </div>
                {complaintDetails.status === "Closed" ? (
                  <div className="rejected-notice" role="status">
                    <strong>Complaint rejected</strong>
                    <span>This complaint has been rejected by the administrator.</span>
                  </div>
                ) : (
                  <div className="status-progress">
                    {statuses.map((status, index) => (
                      <div
                        className={`progress-step ${statuses.indexOf(complaintDetails.status) >= index ? "complete" : ""}`}
                        key={status}
                      >
                        <span>{index + 1}</span>
                        <small>{status}</small>
                      </div>
                    ))}
                  </div>
                )}
                <div className="detail-grid">
                  <div>
                    <span className="summary-label">Category</span>
                    <strong>{complaintDetails.category}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Priority</span>
                    <strong>{complaintDetails.priority}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Submitted</span>
                    <strong>{formatDate(complaintDetails.createdAt)}</strong>
                  </div>
                  <div>
                    <span className="summary-label">Last updated</span>
                    <strong>{formatDate(complaintDetails.updatedAt)}</strong>
                  </div>
                </div>
                <div className="detail-section">
                  <span className="summary-label">Description</span>
                  <p>{complaintDetails.description}</p>
                </div>
                <div className="detail-section response-section">
                  <span className="summary-label">Admin response</span>
                  <p>
                    {complaintDetails.adminResponse ||
                      "No response has been added yet."}
                  </p>
                </div>
              </>
            ) : (
              <div className="state-message error-state">
                Complaint not found or you do not have permission to view it.
              </div>
            )}
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="app-shell auth-shell">
      <section className="intro-panel">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">SC</span>
            <span>Student Care</span>
          </div>
          <span className="secure-label">Secure student access</span>
        </header>
        <div className="intro-copy">
          <p className="eyebrow">Your voice matters</p>
          <h1>
            A clearer path
            <br />
            to being heard.
          </h1>
          <p>
            One calm, secure place to connect with your institution and stay
            close to what happens next.
          </p>
        </div>
        <div className="intro-footer">
          <span className="footer-dot" /> Built for students, by people who
          listen.
        </div>
      </section>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="form-heading">
            <p className="eyebrow">
              {isAdminLogin
                ? "Administrator access"
                : isLogin
                  ? "Welcome back"
                  : "New here?"}
            </p>
            <h2>
              {isAdminLogin
                ? "Sign in as an administrator"
                : isLogin
                  ? "Sign in to your account"
                  : "Create your student account"}
            </h2>
            <p>
              {isAdminLogin
                ? "Use your administrator credentials to continue."
                : isLogin
                  ? "Enter your details to continue to your dashboard."
                  : "It only takes a minute to get started."}
            </p>
          </div>
          <div className="mode-switch" role="tablist">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
            <button
              className={isAdminLogin ? "active admin-tab" : "admin-tab"}
              onClick={() => switchMode("adminLogin")}
            >
              Admin login
            </button>
          </div>
          {message && (
            <div className={`message ${message.type}`} role="alert">
              {message.text}
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <Field
                  label="Full name"
                  name="fullName"
                  value={form.fullName}
                  onChange={updateField}
                  placeholder="e.g. Jordan Lee"
                  autoComplete="name"
                />
                <Field
                  label="Student ID"
                  name="studentId"
                  value={form.studentId}
                  onChange={updateField}
                  placeholder="e.g. STU-2024-001"
                  autoComplete="username"
                />
              </>
            )}
            <Field
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              placeholder="you@university.edu"
              autoComplete="email"
            />
            <Field
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              placeholder="At least 6 characters"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            {mode === "register" && (
              <Field
                label="Confirm password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={updateField}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            )}
            <button className="primary-button" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isAdminLogin
                  ? "Continue to admin dashboard"
                  : isLogin
                    ? "Continue to dashboard"
                    : "Create account"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="terms">
            By continuing, you agree to keep your account details accurate and
            secure.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
