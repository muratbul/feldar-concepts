// The billing switch on the plans: monthly or yearly prices, from each price's data
// attributes. The credits per month are the same either way.
const PERIODS = { monthly: "a month", yearly: "a year" };
// Each new price settles in from a little below.
const SETTLE = [
    { opacity: 0, transform: "translateY(4px)" },
    { opacity: 1, transform: "none" },
];
const SETTLE_TIMING = { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" };

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initPlans(section) {
    const options = [...section.querySelectorAll("[data-billing-option]")];
    const prices = [...section.querySelectorAll("[data-monthly]")];

    const show = (billing) => {
        if (section.dataset.billing === billing) return;
        section.dataset.billing = billing;
        for (const option of options) {
            option.setAttribute("aria-pressed", String(option.dataset.billingOption === billing));
        }
        for (const price of prices) {
            const amount = price.querySelector(".sv-plan-amount");
            amount.textContent = price.dataset[billing];
            price.querySelector(".sv-plan-period").textContent = PERIODS[billing];
            if (!reducedMotion.matches) amount.animate(SETTLE, SETTLE_TIMING);
        }
    };

    for (const option of options) {
        option.addEventListener("click", () => show(option.dataset.billingOption));
    }
}
