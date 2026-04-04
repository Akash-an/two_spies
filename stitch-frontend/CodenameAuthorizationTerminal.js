import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import './CodenameAuthorizationTerminal.css';
const CodenameAuthorizationTerminal = ({ operativeCodename = '', sector = '07-B', latitude = '38.9072° N', longitude = '77.0369° W', threatLevel = 'High', onEstablish, onInputChange, loading = false, }) => {
    const [input, setInput] = useState(operativeCodename);
    useEffect(() => setInput(operativeCodename), [operativeCodename]);
    const generateRandomName = () => {
        const adjectives = ['Silent', 'Shadow', 'Swift', 'Cunning', 'Bold', 'Agile', 'Keen', 'Stealth'];
        const nouns = ['Fox', 'Hawk', 'Raven', 'Viper', 'Ghost', 'Echo', 'Cipher', 'Spark'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}${noun}`;
    };
    const handleGenerateRandom = () => {
        const randomName = generateRandomName();
        setInput(randomName);
        onInputChange?.(randomName);
    };
    const handleSubmit = (e) => {
        e?.preventDefault();
        const nameToSubmit = input.trim() || generateRandomName();
        if (nameToSubmit) {
            onEstablish?.(nameToSubmit);
        }
    };
    return (_jsxs("div", { className: "absolute inset-0 flex flex-col", style: {
            backgroundColor: 'rgba(12, 14, 15, 1)',
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
        }, "data-testid": "terminal-container", children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-20", style: {
                    backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 2px)',
                    zIndex: 50,
                } }), _jsxs("header", { className: "flex justify-between items-center px-6 h-16 border-b flex-shrink-0", style: {
                    borderColor: 'rgba(0, 255, 255, 0.2)',
                    backgroundColor: 'rgba(12, 14, 15, 0.8)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 40,
                }, "data-testid": "terminal-header", children: [_jsx("div", { className: "text-2xl font-black tracking-widest uppercase", style: {
                            color: '#00ffff',
                            textShadow: '0 0 8px rgba(0,255,255,0.5)',
                            fontFamily: 'Space Grotesk, sans-serif',
                        }, "data-testid": "mission-name", children: "MISSION: NEON_PHANTOM" }), _jsx("div", { className: "flex gap-6 items-center", children: _jsx("div", { className: "tracking-widest text-xs", style: { color: '#00ffff', fontFamily: 'Space Grotesk, sans-serif' }, "data-testid": "status-indicator", children: "STATUS: ACTIVE" }) })] }), _jsxs("main", { className: "flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto", style: { zIndex: 20 }, "data-testid": "terminal-main", children: [_jsxs("div", { className: "mb-12 text-center", children: [_jsx("h1", { className: "text-4xl md:text-6xl font-black tracking-[0.2em] mb-4", style: {
                                    color: '#00ffff',
                                    textShadow: '0 0 12px rgba(0,255,255,0.4)',
                                    fontFamily: 'Space Grotesk, sans-serif',
                                }, "data-testid": "terminal-title", children: "CODENAME AUTHORIZATION TERMINAL" }), _jsxs("div", { className: "inline-flex items-center gap-3 px-4 py-1 border", style: {
                                    backgroundColor: 'rgba(29, 32, 33, 1)',
                                    borderColor: 'rgba(0, 255, 255, 0.1)',
                                }, "data-testid": "init-indicator", children: [_jsx("span", { className: "w-2 h-2 animate-pulse", style: { backgroundColor: '#c1fffe' } }), _jsxs("p", { className: "text-xs tracking-tighter uppercase", style: {
                                            color: 'rgba(170, 171, 172, 1)',
                                            fontFamily: 'JetBrains Mono, monospace',
                                        }, children: ["Initializing secure uplink... Sector ", sector, " active"] })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "w-full max-w-xl p-10 relative overflow-hidden", style: {
                            backgroundColor: 'rgba(24, 26, 27, 0.6)',
                            borderColor: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid rgba(0, 255, 255, 0.1)',
                            backdropFilter: 'blur(12px)',
                        }, "data-testid": "terminal-form", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[2px]", style: {
                                    backgroundImage: 'linear-gradient(to right, transparent, rgba(0, 230, 230, 0.5), transparent)',
                                } }), _jsxs("div", { className: "mb-8", children: [_jsx("label", { className: "block text-xs tracking-[0.3em] mb-4 uppercase", style: {
                                            color: 'rgba(0, 230, 230, 1)',
                                            fontFamily: 'Space Grotesk, sans-serif',
                                        }, "data-testid": "codename-label", children: "OPERATIVE CODENAME" }), _jsx("div", { className: "relative group", children: _jsx("input", { type: "text", value: input, onChange: (e) => {
                                                setInput(e.target.value);
                                                onInputChange?.(e.target.value);
                                            }, placeholder: "ENTER CRYPTONYM...", style: {
                                                color: '#00ffff',
                                                width: '100%',
                                                padding: '12px 0',
                                                backgroundColor: 'transparent',
                                                borderColor: 'rgba(0, 230, 230, 0.2)',
                                                borderTop: 'none',
                                                borderLeft: 'none',
                                                borderRight: 'none',
                                                borderBottom: '2px solid rgba(0, 230, 230, 0.2)',
                                                fontFamily: 'JetBrains Mono, monospace',
                                                fontSize: '18px',
                                                letterSpacing: '0.1em',
                                                outline: 'none',
                                                transition: 'border-color 0.3s',
                                                fontWeight: 500,
                                            }, onFocus: (e) => {
                                                e.target.style.borderBottomColor = 'rgba(0, 255, 255, 0.6)';
                                            }, onBlur: (e) => {
                                                e.target.style.borderBottomColor = 'rgba(0, 230, 230, 0.2)';
                                            }, "data-testid": "codename-input", disabled: loading, autoFocus: true }) })] }), _jsxs("div", { className: "flex gap-4 mt-12", children: [_jsx("button", { type: "button", onClick: handleGenerateRandom, disabled: loading, className: "flex-1 py-3 px-4 text-xs tracking-[0.2em] uppercase transition-all", style: {
                                            backgroundColor: 'rgba(254, 152, 0, 0.1)',
                                            color: '#fe9800',
                                            border: '1px solid rgba(254, 152, 0, 0.3)',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.5 : 1,
                                            fontFamily: 'Space Grotesk, sans-serif',
                                            fontWeight: 600,
                                        }, onMouseEnter: (e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'rgba(254, 152, 0, 0.2)';
                                                e.currentTarget.style.borderColor = 'rgba(254, 152, 0, 0.6)';
                                            }
                                        }, onMouseLeave: (e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'rgba(254, 152, 0, 0.1)';
                                                e.currentTarget.style.borderColor = 'rgba(254, 152, 0, 0.3)';
                                            }
                                        }, "data-testid": "generate-button", children: "GENERATE" }), _jsx("button", { type: "submit", disabled: loading, className: "flex-1 py-3 px-4 text-xs tracking-[0.2em] uppercase transition-all", style: {
                                            backgroundColor: 'rgba(0, 255, 255, 0.15)',
                                            color: '#00ffff',
                                            border: '1px solid rgba(0, 255, 255, 0.4)',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.5 : 1,
                                            fontFamily: 'Space Grotesk, sans-serif',
                                            fontWeight: 700,
                                        }, onMouseEnter: (e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.25)';
                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.7)';
                                                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.3)';
                                            }
                                        }, onMouseLeave: (e) => {
                                            if (!loading) {
                                                e.currentTarget.style.backgroundColor = 'rgba(0, 255, 255, 0.15)';
                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 255, 0.4)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }, "data-testid": "submit-button", children: "DEPLOY ASSET" })] })] }), _jsx("div", { className: "mt-8 text-center text-xs", style: {
                            color: 'rgba(170, 171, 172, 0.8)',
                            maxWidth: '600px',
                            fontFamily: 'JetBrains Mono, monospace',
                        }, "data-testid": "help-text", children: _jsx("p", { children: "Enter your operative codename or select GENERATE for a random assignment." }) })] }), _jsx("footer", { className: "px-6 py-4 border-t flex-shrink-0", style: {
                    borderColor: 'rgba(0, 255, 255, 0.1)',
                    backgroundColor: 'rgba(12, 14, 15, 0.6)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 30,
                }, "data-testid": "terminal-footer", children: _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs tracking-widest mb-1 uppercase", style: {
                                        color: 'rgba(0, 230, 230, 0.6)',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: "Sector" }), _jsx("div", { className: "text-sm", style: {
                                        color: '#00ffff',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: sector })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs tracking-widest mb-1 uppercase", style: {
                                        color: 'rgba(0, 230, 230, 0.6)',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: "Threat Level" }), _jsx("div", { className: "text-sm", style: {
                                        color: threatLevel === 'High' ? '#ff716c' : '#00ffff',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: threatLevel })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs tracking-widest mb-1 uppercase", style: {
                                        color: 'rgba(0, 230, 230, 0.6)',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: "Coordinates" }), _jsxs("div", { className: "text-sm", style: {
                                        color: '#00ffff',
                                        fontFamily: 'JetBrains Mono, monospace',
                                    }, children: [latitude, " / ", longitude] })] })] }) })] }));
};
export default CodenameAuthorizationTerminal;
