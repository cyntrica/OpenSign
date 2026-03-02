import { useState, useEffect, useCallback } from "react";
import UsageBar from "../components/UsageBar";
import PlanCard from "../components/PlanCard";

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionToken = localStorage.getItem("accesstoken");
      const opts = { sessionToken };
      const [sub, usageData, plansData] = await Promise.all([
        Parse.Cloud.run("membership_getSubscription", {}, opts),
        Parse.Cloud.run("membership_getUsage", {}, opts),
        Parse.Cloud.run("membership_getPlans", {}, opts),
      ]);
      setSubscription(sub);
      setUsage(usageData);
      setPlans(plansData);
    } catch (err) {
      console.error("[Billing] fetch error:", err);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (planId) => {
    try {
      setError(null);
      const result = await Parse.Cloud.run(
        "membership_createCheckout",
        { planId },
        { sessionToken: localStorage.getItem("accesstoken") }
      );
      window.location.href = result.url;
    } catch (err) {
      setError(err.message);
    }
  };

  const handleManage = async () => {
    try {
      setError(null);
      const result = await Parse.Cloud.run(
        "membership_createPortalSession",
        {},
        { sessionToken: localStorage.getItem("accesstoken") }
      );
      window.location.href = result.url;
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <span className="op-loading op-loading-infinity op-loading-lg" />
      </div>
    );
  }

  const planData = subscription?.PlanId || {};
  const limits = planData.limits || {};
  const planName = planData.name || "No Plan";
  const isFree = planData.slug === "free";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Billing & Usage</h1>

      {error && (
        <div className="op-alert op-alert-error mb-4">
          <i className="fa-light fa-circle-exclamation" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Plan */}
      <div className="op-card bg-base-100 shadow mb-6">
        <div className="op-card-body">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="op-card-title text-lg">
                Current Plan: {planName}
              </h2>
              <p className="text-base-content/60 text-sm">
                {isFree
                  ? "Free tier with basic limits"
                  : `Status: ${subscription?.status || "unknown"}`}
              </p>
              {subscription?.cancelAtPeriodEnd && (
                <p className="text-warning mt-1 text-sm">
                  <i className="fa-light fa-triangle-exclamation mr-1" />
                  Cancels at end of billing period
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {!isFree && subscription?.stripeCustomerId && (
                <button
                  className="op-btn op-btn-outline op-btn-sm"
                  onClick={handleManage}
                >
                  <i className="fa-light fa-gear mr-1" /> Manage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <UsageBar
            label="Documents this month"
            current={usage.documentsThisMonth}
            max={limits.documentsPerMonth}
            icon="fa-light fa-file-signature"
          />
          <UsageBar
            label="Templates"
            current={usage.templates}
            max={limits.templates}
            icon="fa-light fa-file-contract"
          />
          <UsageBar
            label="Storage"
            current={usage.storageBytes}
            max={limits.storageBytes}
            icon="fa-light fa-hard-drive"
            formatValue={formatBytes}
          />
          <UsageBar
            label="Team seats"
            current={usage.seats}
            max={limits.seats}
            icon="fa-light fa-users"
          />
        </div>
      )}

      {/* Available Plans (for upgrade) */}
      {plans.length > 1 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.objectId}
                plan={plan}
                isCurrent={plan.objectId === planData.objectId}
                onUpgrade={() => handleUpgrade(plan.objectId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
