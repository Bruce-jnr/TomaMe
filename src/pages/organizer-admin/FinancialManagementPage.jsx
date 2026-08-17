import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, WalletCards } from "lucide-react";
import { AdminLayout, AdminLoading, AdminEmpty } from "./AdminShell.jsx";
import { api } from "./adminApi.js";
function money(amount, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(
    (amount || 0) / 100,
  );
}

export function FinancialManagementPage({ session }) {
  const [data, setData] = useState(null);
  const [withdrawalData, setWithdrawalData] = useState({
    items: [],
    pagination: { page: 1, total: 0, pageCount: 0 },
  });
  const [ledgerData, setLedgerData] = useState({
    items: [],
    pagination: { page: 1, total: 0, pageCount: 0 },
  });
  const [paystackBalance, setPaystackBalance] = useState({
    balances: [],
    cachedAt: null,
    loading: true,
  });
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [recipientType, setRecipientType] = useState("mobile_money");
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providerCode, setProviderCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountResolving, setAccountResolving] = useState(false);
  const [verifyFeedback, setVerifyFeedback] = useState(null);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", message: "" });
  const loadOverview = useCallback(
    () => api("/api/v1/superadmin/financial/overview").then(setData),
    [],
  );
  const loadWithdrawals = useCallback(
    (page) =>
      api(`/api/v1/superadmin/financial/withdrawals?page=${page}`).then(
        setWithdrawalData,
      ),
    [],
  );
  const loadLedger = useCallback(
    (page) =>
      api(`/api/v1/superadmin/financial/ledger?page=${page}`).then(
        setLedgerData,
      ),
    [],
  );
  const refreshFinancialData = useCallback(() => {
    const requests = [loadOverview()];
    if (withdrawalPage === 1) requests.push(loadWithdrawals(1));
    else setWithdrawalPage(1);
    if (ledgerPage === 1) requests.push(loadLedger(1));
    else setLedgerPage(1);
    return Promise.all(requests);
  }, [ledgerPage, loadLedger, loadOverview, loadWithdrawals, withdrawalPage]);
  useEffect(() => {
    loadOverview()
      .then(() => setState({ loading: false, error: "", message: "" }))
      .catch((error) =>
        setState({ loading: false, error: error.message, message: "" }),
      );
    api("/api/v1/superadmin/financial/paystack-balance")
      .then((result) => setPaystackBalance({ ...result, loading: false }))
      .catch(() =>
        setPaystackBalance({ balances: [], cachedAt: null, loading: false }),
      );
  }, [loadOverview]);
  useEffect(() => {
    loadWithdrawals(withdrawalPage).catch((error) =>
      setActionFeedback({ type: "error", message: error.message }),
    );
  }, [loadWithdrawals, withdrawalPage]);
  useEffect(() => {
    loadLedger(ledgerPage).catch((error) =>
      setActionFeedback({ type: "error", message: error.message }),
    );
  }, [ledgerPage, loadLedger]);
  useEffect(() => {
    let active = true;
    api(
      `/api/v1/superadmin/financial/providers?type=${recipientType}&currency=GHS`,
    )
      .then((items) => {
        if (active) setProviders(items);
      })
      .catch((error) => {
        if (!active) return;
        setProviders([]);
        setVerifyFeedback({ type: "error", message: error.message });
      })
      .finally(() => {
        if (active) setProvidersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [recipientType]);

  async function resolveRecipient() {
    if (recipientType === "mobile_money" || !providerCode || !accountNumber)
      return;
    setAccountResolving(true);
    setAccountName("");
    setVerifyFeedback(null);
    try {
      const resolved = await api(
        "/api/v1/superadmin/financial/recipients/resolve",
        {
          method: "POST",
          body: JSON.stringify({
            type: recipientType,
            accountNumber,
            bankCode: providerCode,
          }),
        },
      );
      setAccountName(resolved.accountName);
      setVerifyFeedback({
        type: "success",
        message: `Destination verified as ${resolved.accountName}.`,
      });
    } catch (error) {
      setVerifyFeedback({ type: "error", message: error.message });
    } finally {
      setAccountResolving(false);
    }
  }

  async function requestWithdrawal(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setWithdrawalFeedback(null);
    try {
      await api("/api/v1/superadmin/financial/withdrawals", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          eventId: form.get("eventId"),
          type: recipientType,
          bankCode: providerCode,
          accountNumber,
          name: accountName,
          amount: Math.round(Number(form.get("amount")) * 100),
        }),
      });
      element.reset();
      setAccountNumber("");
      setAccountName("");
      setProviderCode("");
      setVerifyFeedback(null);
      await refreshFinancialData();
      setWithdrawalFeedback({
        type: "success",
        message: "Withdrawal created from the selected event revenue.",
      });
    } catch (error) {
      setWithdrawalFeedback({ type: "error", message: error.message });
    }
  }
  async function withdrawalAction(item, action) {
    const body =
      action === "process"
        ? {
            password: window.prompt(
              "Enter your current password to initiate this transfer:",
            ),
          }
        : undefined;
    if (action === "process" && !body.password) return;
    if (
      !window.confirm(
        `${action[0].toUpperCase() + action.slice(1)} withdrawal ${item.reference}?`,
      )
    )
      return;
    setActionFeedback(null);
    try {
      const result = await api(
        `/api/v1/superadmin/financial/withdrawals/${item.id}/${action}`,
        { method: "POST", body: body ? JSON.stringify(body) : undefined },
      );
      if (action === "process" && result?.requiresOtp) {
        const otp = window.prompt("Enter the six-digit Paystack transfer OTP:");
        if (otp)
          await api(
            `/api/v1/superadmin/financial/withdrawals/${item.id}/finalize`,
            { method: "POST", body: JSON.stringify({ otp }) },
          );
      }
      await refreshFinancialData();
      setActionFeedback({
        type: "success",
        message: `Withdrawal ${action} action completed.`,
      });
    } catch (error) {
      setActionFeedback({ type: "error", message: error.message });
    }
  }
  if (state.loading)
    return (
      <AdminLayout
        session={session}
        title="Financial management"
        description="Wallet, ledger, and Paystack transfers."
      >
        <AdminLoading type="cards" />
      </AdminLayout>
    );
  const balance = data?.balance || {};
  return (
    <AdminLayout
      session={session}
      title="Financial management"
      description="Reconcile verified revenue, event fees, wallet entitlement, and Paystack transfers."
    >
      {state.error && <div className="admin-alert">{state.error}</div>}
      <div className="payment-summary financial-summary">
        <div>
          <small>Total revenue</small>
          <strong>{money(balance.totalEarned, balance.currency)}</strong>
        </div>
        <div>
          <small>Platform fees</small>
          <strong>{money(balance.totalFees, balance.currency)}</strong>
        </div>
        <div>
          <small>Withdrawn</small>
          <strong>{money(balance.totalWithdrawn, balance.currency)}</strong>
        </div>
        <div>
          <small>Pending</small>
          <strong>{money(balance.pendingWithdrawals, balance.currency)}</strong>
        </div>
        <div>
          <small>Available</small>
          <strong>{money(balance.availableBalance, balance.currency)}</strong>
        </div>
      </div>
      <section className="financial-paystack-balance">
        <span>Paystack account balance</span>
        <strong>
          {paystackBalance.loading
            ? "Loading..."
            : paystackBalance.balances.length
              ? paystackBalance.balances
                  .map((item) => money(item.balance, item.currency))
                  .join(" / ")
              : "Unavailable"}
        </strong>
        <small>
          This provider balance is separate from TomaMe wallet entitlement.
        </small>
      </section>
      <form
        className="admin-form administrator-registration financial-withdrawal-form"
        onSubmit={requestWithdrawal}
      >
        <div>
          <span className="eyebrow">Wallet transfer</span>
          <h2>Make withdrawal</h2>
        </div>
        <label>
          Event revenue
          <select name="eventId" required>
            <option value="">Select event revenue</option>
            {(data.eventRevenue || []).map((event) => (
              <option
                value={event.id}
                key={event.id}
                disabled={event.availableBalance <= 0}
              >
                {event.name} · {money(event.availableBalance, event.currency)}{" "}
                available
              </option>
            ))}
          </select>
        </label>
        <div className="admin-form-row">
          <label>
            Destination type
            <select
              name="type"
              value={recipientType}
              onChange={(event) => {
                setRecipientType(event.target.value);
                setProvidersLoading(true);
                setProviderCode("");
                setAccountName("");
                setVerifyFeedback(null);
              }}
            >
              <option value="mobile_money">Mobile money</option>
              <option value="ghipss">Bank / GHiPSS</option>
            </select>
          </label>
          <label>
            {recipientType === "mobile_money" ? "Mobile money network" : "Bank"}
            <select
              name="bankCode"
              required
              disabled={providersLoading}
              value={providerCode}
              onChange={(event) => {
                setProviderCode(event.target.value);
                setAccountName("");
                setVerifyFeedback(null);
              }}
            >
              <option value="">
                {providersLoading ? "Loading providers..." : "Select provider"}
              </option>
              {providers.map((provider) => (
                <option value={provider.code} key={provider.code}>
                  {provider.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Account or phone number
            <input
              name="accountNumber"
              required
              inputMode="numeric"
              placeholder={
                recipientType === "mobile_money"
                  ? "0241234567"
                  : "Account number"
              }
              value={accountNumber}
              onChange={(event) => {
                setAccountNumber(event.target.value);
                setAccountName("");
                setVerifyFeedback(null);
              }}
              onBlur={recipientType === "ghipss" ? resolveRecipient : undefined}
            />
          </label>
          <label>
            Amount (GHS)
            <input name="amount" type="number" min="1" step="0.01" required />
          </label>
        </div>
        {recipientType === "ghipss" && (
          <button
            className="secondary-action"
            type="button"
            onClick={resolveRecipient}
            disabled={!providerCode || !accountNumber || accountResolving}
          >
            {accountResolving ? "Verifying..." : "Verify destination"}
          </button>
        )}
        {verifyFeedback && (
          <div
            className={`admin-inline-feedback ${verifyFeedback.type}`}
            role={verifyFeedback.type === "error" ? "alert" : "status"}
          >
            {verifyFeedback.message}
          </div>
        )}
        <label>
          {recipientType === "mobile_money"
            ? "Registered mobile-money name"
            : "Verified recipient name"}
          <input
            value={accountName}
            readOnly={recipientType === "ghipss"}
            onChange={
              recipientType === "mobile_money"
                ? (event) => setAccountName(event.target.value)
                : undefined
            }
            placeholder={
              recipientType === "mobile_money"
                ? "Enter the name registered to this number"
                : "Verify the destination to fetch its registered name"
            }
          />
        </label>
        <button
          className="primary-action"
          type="submit"
          disabled={
            providersLoading ||
            !providers.length ||
            !accountName ||
            accountResolving ||
            !(data.eventRevenue || []).some(
              (event) => event.availableBalance > 0,
            )
          }
        >
          Make withdrawal
        </button>
        {withdrawalFeedback && (
          <div
            className={`admin-inline-feedback ${withdrawalFeedback.type}`}
            role={withdrawalFeedback.type === "error" ? "alert" : "status"}
          >
            {withdrawalFeedback.message}
          </div>
        )}
      </form>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Transfers</span>
          <h2>Withdrawals</h2>
        </div>
      </div>
      {actionFeedback && (
        <div
          className={`admin-inline-feedback ${actionFeedback.type}`}
          role={actionFeedback.type === "error" ? "alert" : "status"}
        >
          {actionFeedback.message}
        </div>
      )}
      {withdrawalData.items.length ? (
        <div className="candidate-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Event</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalData.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b className="table-reference">{item.reference}</b>
                  </td>
                  <td>{item.event?.name || "Event"}</td>
                  <td>
                    {item.payoutRecipient.name}
                    <small>{item.payoutRecipient.accountNumber}</small>
                  </td>
                  <td>{money(item.amount, item.currency)}</td>
                  <td>
                    <span
                      className={`payment-status ${item.status === "SUCCESS" ? "paid" : item.status === "FAILED" || item.status === "REVERSED" ? "failed" : ""}`}
                    >
                      <i />
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      {item.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => withdrawalAction(item, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => withdrawalAction(item, "reject")}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {item.status === "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => withdrawalAction(item, "process")}
                        >
                          Process
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmpty
          icon={WalletCards}
          title="No withdrawals"
          text="Your withdrawals will appear here."
        />
      )}
      {withdrawalData.pagination.pageCount > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            disabled={withdrawalPage <= 1}
            onClick={() => setWithdrawalPage((page) => page - 1)}
          >
            <ChevronLeft /> Previous
          </button>
          <span>
            Page {withdrawalData.pagination.page} of{" "}
            {withdrawalData.pagination.pageCount}
          </span>
          <button
            type="button"
            disabled={withdrawalPage >= withdrawalData.pagination.pageCount}
            onClick={() => setWithdrawalPage((page) => page + 1)}
          >
            Next <ChevronRight />
          </button>
        </div>
      )}
      <div className="section-heading">
        <div>
          <span className="eyebrow">Append-only record</span>
          <h2>Recent ledger</h2>
        </div>
      </div>
      <div className="candidate-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Event</th>
              <th>Reference</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {ledgerData.items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>{item.type.replaceAll("_", " ")}</td>
                <td>{item.event?.name || "Wallet"}</td>
                <td>
                  <b className="table-reference">{item.reference}</b>
                </td>
                <td
                  className={item.amount < 0 ? "ledger-debit" : "ledger-credit"}
                >
                  {item.amount < 0 ? "-" : "+"}
                  {money(Math.abs(item.amount), balance.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ledgerData.pagination.pageCount > 1 && (
        <div className="admin-pagination">
          <button
            type="button"
            disabled={ledgerPage <= 1}
            onClick={() => setLedgerPage((page) => page - 1)}
          >
            <ChevronLeft /> Previous
          </button>
          <span>
            Page {ledgerData.pagination.page} of{" "}
            {ledgerData.pagination.pageCount}
          </span>
          <button
            type="button"
            disabled={ledgerPage >= ledgerData.pagination.pageCount}
            onClick={() => setLedgerPage((page) => page + 1)}
          >
            Next <ChevronRight />
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
