import { Box, Paper, Typography, Avatar, useTheme } from "@mui/material";
import { SmartToy, Person } from "@mui/icons-material";

const MULTILINGUAL_FONT_STACK = [
    "Noto Sans Tamil",
    "Nirmala UI",
    "Latha",
    "Arial Unicode MS",
    "Noto Sans",
    "Segoe UI",
    "sans-serif",
].join(", ");

export default function MessageBubble({ message, userAvatar }) {
    const theme = useTheme();
    const isAi = message.role === "ai" || message.role === "assistant";

    const parsed = isAi ? parseAiSections(message.text || message.content || "") : null;

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: isAi ? "flex-start" : "flex-end",
                mb: 2,
                gap: 1.5,
                alignItems: "flex-end", // Align avatars to bottom
            }}
        >
            {/* AI Avatar */}
            {isAi && (
                <Avatar
                    sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 32,
                        height: 32,
                    }}
                >
                    <SmartToy sx={{ fontSize: 20, color: "white" }} />
                </Avatar>
            )}

            {/* Message Bubble */}
            <Paper
                elevation={isAi ? 1 : 2}
                sx={{
                    p: 2,
                    maxWidth: "75%",
                    fontFamily: MULTILINGUAL_FONT_STACK,
                    borderRadius: 2,
                    // Bubble Styling based on sender
                    borderBottomLeftRadius: isAi ? 0 : 2,
                    borderBottomRightRadius: isAi ? 2 : 0,
                    bgcolor: isAi
                        ? theme.palette.background.paper
                        : theme.palette.primary.main,
                    color: isAi
                        ? theme.palette.text.primary
                        : theme.palette.primary.contrastText,
                }}
            >
                {!isAi && message.imagePreviewUrl && (
                    <Box
                        component="img"
                        src={message.imagePreviewUrl}
                        alt={message.imageName || "Uploaded question"}
                        sx={{
                            display: "block",
                            width: "100%",
                            maxWidth: 220,
                            maxHeight: 220,
                            objectFit: "cover",
                            borderRadius: 1.5,
                            mb: message.text || message.content ? 1 : 0,
                            bgcolor: "rgba(255,255,255,0.16)",
                        }}
                    />
                )}

                {isAi && parsed ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                        {parsed.visual && (
                            <Box sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "action.hover" }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Visual Explanation
                                </Typography>
                                {renderVisual(parsed)}
                            </Box>
                        )}

                        {parsed.text && (
                            <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                    Text Explanation
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}
                                >
                                    {parsed.text}
                                </Typography>
                            </Box>
                        )}

                        {!parsed.visual && !parsed.text && (
                            <Typography
                                variant="body1"
                                sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}
                            >
                                {message.text || message.content}
                            </Typography>
                        )}
                    </Box>
                ) : (
                    <Typography
                        variant="body1"
                        sx={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: 1.6,
                        }}
                    >
                        {message.text || message.content}
                    </Typography>
                )}
            </Paper>

            {/* User Avatar */}
            {!isAi && (
                <Avatar
                    src={userAvatar}
                    sx={{
                        width: 32,
                        height: 32,
                        bgcolor: theme.palette.secondary.main,
                    }}
                >
                    {!userAvatar && <Person />}
                </Avatar>
            )}
        </Box>
    );
}

function parseAiSections(raw) {
    const text = String(raw || "");
    const bestFormatMatch = text.match(/best format\s*[:\-]\s*(diagram|table|pie)/i);
    const visualMatch = text.match(/visual explanation\s*[:\-]\s*([\s\S]*?)(?=\n\s*text explanation\s*[:\-]|$)/i);
    const textMatch = text.match(/text explanation\s*[:\-]\s*([\s\S]*)$/i);

    if (!visualMatch && !textMatch) return null;

    return {
        bestFormat: (bestFormatMatch?.[1] || "").toLowerCase(),
        visual: visualMatch?.[1]?.trim() || "",
        text: textMatch?.[1]?.trim() || "",
    };
}

function renderVisual(parsed) {
    const visual = String(parsed?.visual || "").trim();
    if (!visual) return null;

    if (parsed?.bestFormat === "table" || hasMarkdownTable(visual)) {
        const rows = parseMarkdownTable(visual);
        if (rows.length >= 2) {
            const headers = rows[0];
            const body = rows.slice(1);
            return (
                <Box sx={{ overflowX: "auto" }}>
                    <Box sx={{ minWidth: 320, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                        <Box sx={{ display: "grid", gridTemplateColumns: `repeat(${headers.length}, minmax(110px, 1fr))`, bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
                            {headers.map((h, i) => (
                                <Typography key={i} variant="caption" sx={{ p: 1, fontWeight: 700 }}>
                                    {h}
                                </Typography>
                            ))}
                        </Box>
                        {body.map((row, rIdx) => (
                            <Box key={rIdx} sx={{ display: "grid", gridTemplateColumns: `repeat(${headers.length}, minmax(110px, 1fr))`, borderBottom: rIdx === body.length - 1 ? "none" : "1px solid", borderColor: "divider" }}>
                                {row.map((cell, cIdx) => (
                                    <Typography key={cIdx} variant="caption" sx={{ p: 1 }}>
                                        {cell}
                                    </Typography>
                                ))}
                            </Box>
                        ))}
                    </Box>
                </Box>
            );
        }
    }

    if (parsed?.bestFormat === "pie" || hasPieData(visual)) {
        const slices = parsePieData(visual);
        if (slices.length) {
            return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    {slices.map((slice, idx) => (
                        <Box key={idx}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>{slice.label}</Typography>
                                <Typography variant="caption">{slice.value}%</Typography>
                            </Box>
                            <Box sx={{ width: "100%", height: 8, bgcolor: "grey.300", borderRadius: 999 }}>
                                <Box sx={{ width: `${Math.min(100, Math.max(0, slice.value))}%`, height: "100%", bgcolor: "primary.main", borderRadius: 999 }} />
                            </Box>
                        </Box>
                    ))}
                </Box>
            );
        }
    }

    const diagramSrc = buildFlowDiagramSvg(visual);
    if (diagramSrc) {
        return (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                    component="img"
                    src={diagramSrc}
                    alt="AI visual diagram"
                    sx={{
                        width: "100%",
                        maxWidth: 560,
                        borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "#ffffff",
                    }}
                />
                <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}
                >
                    {visual}
                </Typography>
            </Box>
        );
    }

    return (
        <Typography
            variant="body2"
            sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}
        >
            {visual}
        </Typography>
    );
}

function hasMarkdownTable(text) {
    return /\|.+\|/.test(text);
}

function parseMarkdownTable(text) {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("|") && line.endsWith("|"))
        .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
        .filter((row) => !row.every((cell) => /^:?-{2,}:?$/.test(cell)));
}

function hasPieData(text) {
    return /%/.test(text) && /[:\-]/.test(text);
}

function parsePieData(text) {
    const slices = [];
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
        const m = line.match(/^[\-\*\d\.\)]*\s*([A-Za-z][A-Za-z0-9\s_]+)\s*[:\-]\s*(\d{1,3})\s*%/);
        if (m) {
            slices.push({ label: m[1].trim(), value: Number(m[2]) });
        }
    }

    return slices;
}

function buildFlowDiagramSvg(visualText) {
    const firstFlowLine = String(visualText || "")
        .split("\n")
        .map((line) => line.trim())
        .find((line) => /->|→/.test(line));

    if (!firstFlowLine) return null;

    const nodes = firstFlowLine
        .split(/->|→/g)
        .map((n) => n.trim())
        .filter(Boolean)
        .slice(0, 6);

    if (nodes.length < 2) return null;

    const boxW = 160;
    const boxH = 54;
    const gap = 36;
    const pad = 20;
    const width = pad * 2 + nodes.length * boxW + (nodes.length - 1) * gap;
    const height = 110;

    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
    parts.push(`<rect width="${width}" height="${height}" fill="#ffffff"/>`);

    nodes.forEach((node, i) => {
        const x = pad + i * (boxW + gap);
        const y = (height - boxH) / 2;
        const safe = escapeXml(shorten(node, 28));

        parts.push(`<rect x="${x}" y="${y}" rx="10" ry="10" width="${boxW}" height="${boxH}" fill="#eef6ff" stroke="#8ab4f8" />`);
        parts.push(`<text x="${x + boxW / 2}" y="${y + boxH / 2 + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#1f2937">${safe}</text>`);

        if (i < nodes.length - 1) {
            const ax1 = x + boxW + 6;
            const ax2 = x + boxW + gap - 8;
            const ay = height / 2;
            parts.push(`<line x1="${ax1}" y1="${ay}" x2="${ax2}" y2="${ay}" stroke="#2563eb" stroke-width="2.2" />`);
            parts.push(`<polygon points="${ax2},${ay} ${ax2 - 8},${ay - 5} ${ax2 - 8},${ay + 5}" fill="#2563eb" />`);
        }
    });

    parts.push(`</svg>`);

    return `data:image/svg+xml;utf8,${encodeURIComponent(parts.join(""))}`;
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function shorten(str, max) {
    const s = String(str || "").trim();
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}
