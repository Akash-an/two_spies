import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import './SecureLinkFrequency.css';
const SecureLinkFrequency = ({ frequency = '000.0', onTune, autoTune = false, logs = [], className = '', loading = false, }) => {
    const [value, setValue] = useState(String(frequency));
    useEffect(() => setValue(String(frequency)), [frequency]);
    const tune = (e) => {
        e?.preventDefault();
        onTune?.(value);
    };
    return (_jsxs("div", { className: `secure-link p-6 rounded-lg ${className}`, children: [_jsx("h3", { className: "text-lg font-headline mb-2", children: "SECURE LINK FREQUENCY" }), _jsxs("form", { onSubmit: tune, className: "flex items-center gap-3 mb-4", children: [_jsx("input", { value: value, onChange: (e) => setValue(e.target.value), className: "input-neon", "aria-label": "frequency" }), _jsx("button", { className: "primary-cta", onClick: tune, disabled: loading, children: loading ? 'Tuning…' : autoTune ? 'AUTO TUNE' : 'TUNE' })] }), _jsx("div", { className: "terminal-log", children: logs.length === 0 ? (_jsx("div", { className: "text-muted", children: "No activity" })) : (logs.map((l, i) => (_jsx("div", { className: "terminal-line", children: l }, i)))) })] }));
};
export default SecureLinkFrequency;
