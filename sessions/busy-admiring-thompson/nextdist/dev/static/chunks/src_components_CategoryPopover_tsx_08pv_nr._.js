(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/CategoryPopover.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CategoryPopover
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
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
function CategoryPopover({ children, className = '' }) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CategoryPopover.useEffect": ()=>{
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
            return ({
                "CategoryPopover.useEffect": ()=>{
                    document.removeEventListener('keydown', onKey);
                    document.removeEventListener('click', onDocClick);
                }
            })["CategoryPopover.useEffect"];
        }
    }["CategoryPopover.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("details", {
        ref: ref,
        className: className,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/CategoryPopover.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_s(CategoryPopover, "8uVE59eA/r6b92xF80p7sH8rXLk=");
_c = CategoryPopover;
var _c;
__turbopack_context__.k.register(_c, "CategoryPopover");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_CategoryPopover_tsx_08pv_nr._.js.map