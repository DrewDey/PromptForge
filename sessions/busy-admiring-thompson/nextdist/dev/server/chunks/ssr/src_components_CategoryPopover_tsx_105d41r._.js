module.exports = [
"[project]/src/components/CategoryPopover.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CategoryPopover
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
// Iteration 27 (2026-04-16):
// Thin client-component wrapper around the native <details> category popover
// so we can keep progressive-disclosure HTML semantics (the element still
// opens/closes with zero JS if this component fails to hydrate) while
// layering on the three a11y affordances the iter 26 reviewer flagged:
//   (1) Escape key closes
//   (2) click-outside closes
//   (3) 150ms fade-in + subtle scale-up on open (matches the 150ms cadence
//       used elsewhere in the design system)
//
// The component renders <details> directly — children are whatever the
// server component passes in (the <summary> button + the floating panel).
// We never touch the DOM of children; only the wrapper's open state.
'use client';
;
;
function CategoryPopover({ children, className = '' }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = ref.current;
        if (!el) return;
        function onKey(e) {
            if (e.key !== 'Escape') return;
            const d = ref.current;
            if (!d || !d.open) return;
            d.open = false;
            // Return focus to the summary so keyboard users know where they are.
            const summary = d.querySelector('summary');
            summary?.focus();
        }
        function onDocClick(e) {
            const d = ref.current;
            if (!d || !d.open) return;
            if (e.target instanceof Node && d.contains(e.target)) return;
            d.open = false;
        }
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onDocClick);
        return ()=>{
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('click', onDocClick);
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
        ref: ref,
        className: className,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/CategoryPopover.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_components_CategoryPopover_tsx_105d41r._.js.map