import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Public, Refresh, RestartAlt, Remove, TaskAlt } from "@mui/icons-material";

const mapPhotos = [
  {
    id: "india",
    title: "India Outline Map",
    imageUrl: "/maps/india outline.jpg",
    practiceImageUrl: "/maps/india outline empty.jpg",
    practiceAspectRatio: "862 / 1000",
    questions: [
      { id: "india-1", label: "North India", answer: "north india", marks: 2, x: 46, y: 22 },
      { id: "india-2", label: "West India", answer: "west india", marks: 2, x: 28, y: 47 },
      { id: "india-3", label: "East India", answer: "east india", marks: 2, x: 69, y: 43 },
      { id: "india-4", label: "South India", answer: "south india", marks: 2, x: 44, y: 76 },
      { id: "india-5", label: "Island Territories", answer: "island territories", marks: 2, x: 78, y: 75 },
      { id: "india-6", label: "Rajasthan", answer: "rajasthan", marks: 2, x: 26, y: 40 },
      { id: "india-7", label: "Gujarat", answer: "gujarat", marks: 2, x: 25, y: 53 },
      { id: "india-8", label: "Maharashtra", answer: "maharashtra", marks: 2, x: 36, y: 60 },
      { id: "india-9", label: "Tamil Nadu", answer: "tamil nadu", marks: 2, x: 45, y: 83 },
      { id: "india-10", label: "Assam", answer: "assam", marks: 2, x: 76, y: 36 },
      { id: "india-11", label: "Odisha", answer: "odisha", marks: 2, x: 57, y: 56 },
      { id: "india-12", label: "Kerala", answer: "kerala", marks: 2, x: 39, y: 84 },
    ],
  },
  {
    id: "world-ocean",
    title: "World Ocean Outline Map",
    imageUrl: "/maps/world ocean map.jpg",
    practiceImageUrl: "/maps/world ocean empty.webp",
    practiceAspectRatio: "2560 / 1297",
    questions: [
      { id: "ocean-1", label: "Pacific Ocean", answer: "pacific ocean", marks: 2, x: 18, y: 47 },
      { id: "ocean-2", label: "Atlantic Ocean", answer: "atlantic ocean", marks: 2, x: 45, y: 47 },
      { id: "ocean-3", label: "Indian Ocean", answer: "indian ocean", marks: 2, x: 67, y: 57 },
      { id: "ocean-4", label: "Southern Ocean", answer: "southern ocean", marks: 2, x: 50, y: 84 },
      { id: "ocean-5", label: "Arctic Ocean", answer: "arctic ocean", marks: 2, x: 50, y: 14 },
      { id: "ocean-6", label: "North Pacific Ocean", answer: "north pacific ocean", marks: 2, x: 20, y: 34 },
      { id: "ocean-7", label: "South Pacific Ocean", answer: "south pacific ocean", marks: 2, x: 20, y: 64 },
      { id: "ocean-8", label: "North Atlantic Ocean", answer: "north atlantic ocean", marks: 2, x: 45, y: 34 },
      { id: "ocean-9", label: "South Atlantic Ocean", answer: "south atlantic ocean", marks: 2, x: 45, y: 63 },
    ],
  },
];

const PRACTICE_QUESTION_COUNT = 5;

function selectPracticeQuestions(questions, round) {
  return [...questions]
    .sort((left, right) => {
      const leftScore = (questions.indexOf(left) * 7 + round * 3) % questions.length;
      const rightScore = (questions.indexOf(right) * 7 + round * 3) % questions.length;
      return leftScore - rightScore;
    })
    .slice(0, PRACTICE_QUESTION_COUNT);
}

function normalizeAnswer(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAssetUrl(url = "") {
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const assetPath = url.startsWith("/") ? url.slice(1) : url;

  return encodeURI(`${basePath}${assetPath}`);
}

export default function MapsPanel() {
  const [zooms, setZooms] = useState(() =>
    mapPhotos.reduce((items, map) => ({ ...items, [map.id]: 1 }), {})
  );
  const [practiceMapId, setPracticeMapId] = useState("");
  const [practiceRound, setPracticeRound] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const practiceMap = useMemo(
    () => mapPhotos.find((map) => map.id === practiceMapId),
    [practiceMapId]
  );
  const practiceQuestions = useMemo(
    () => (practiceMap ? selectPracticeQuestions(practiceMap.questions, practiceRound) : []),
    [practiceMap, practiceRound]
  );

  const changeZoom = (mapId, nextZoom) => {
    setZooms((current) => ({
      ...current,
      [mapId]: Math.min(2, Math.max(1, nextZoom)),
    }));
  };

  const startPractice = (mapId) => {
    setPracticeMapId(mapId);
    setPracticeRound((current) => current + 1);
    setAnswers({});
    setResult(null);
  };

  const refreshPractice = () => {
    setPracticeRound((current) => current + 1);
    setAnswers({});
    setResult(null);
  };

  const updateAnswer = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  };

  const submitPractice = () => {
    if (!practiceMap) return;

    const checked = practiceQuestions.map((question) => {
      const studentAnswer = normalizeAnswer(answers[question.id]);
      const correctAnswer = normalizeAnswer(question.answer);
      const isCorrect =
        studentAnswer &&
        (studentAnswer === correctAnswer ||
          studentAnswer.includes(correctAnswer) ||
          correctAnswer.includes(studentAnswer));

      return {
        ...question,
        isCorrect,
        earnedMarks: isCorrect ? question.marks : 0,
      };
    });

    setResult({
      checked,
      score: checked.reduce((sum, question) => sum + question.earnedMarks, 0),
      total: checked.reduce((sum, question) => sum + question.marks, 0),
    });
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Public color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Maps
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {mapPhotos.map((map) => {
            const zoom = zooms[map.id] || 1;
            const isPracticeOpen = practiceMapId === map.id;

            return (
              <Grid item xs={12} md={6} key={map.id}>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "#f8fbff",
                    p: { xs: 1.25, sm: 1.5 },
                    height: "100%",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography fontWeight={800}>{map.title}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        onClick={() => changeZoom(map.id, zoom - 0.2)}
                        disabled={zoom <= 1}
                        aria-label={`Zoom out ${map.title}`}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <Chip size="small" label={`${Math.round(zoom * 100)}%`} />
                      <IconButton
                        size="small"
                        onClick={() => changeZoom(map.id, zoom + 0.2)}
                        disabled={zoom >= 2}
                        aria-label={`Zoom in ${map.title}`}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => changeZoom(map.id, 1)}
                        aria-label={`Reset zoom ${map.title}`}
                      >
                        <RestartAlt fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Box
                    sx={{
                      height: { xs: 280, sm: 360 },
                      overflow: "auto",
                      bgcolor: "white",
                      borderRadius: 1,
                    }}
                  >
                    <Box
                      component="img"
                      src={resolveAssetUrl(map.imageUrl)}
                      alt={map.title}
                      sx={{
                        display: "block",
                        width: `${zoom * 100}%`,
                        minWidth: "100%",
                        height: "100%",
                        objectFit: "contain",
                        filter: isPracticeOpen ? "blur(6px)" : "none",
                        opacity: isPracticeOpen ? 0.45 : 1,
                        transformOrigin: "top left",
                        transition: "filter 180ms ease, opacity 180ms ease",
                      }}
                    />
                  </Box>

                  <Button
                    variant="contained"
                    startIcon={<TaskAlt />}
                    onClick={() => startPractice(map.id)}
                    fullWidth
                    sx={{ mt: 1.5, fontWeight: 800 }}
                  >
                    Practice
                  </Button>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {practiceMap ? (
          <Box
            sx={{
              mt: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              sx={{ mb: 1.5 }}
            >
              <Typography variant="h6" fontWeight={800}>
                {practiceMap.title} Practice
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton
                  size="small"
                  onClick={() => changeZoom(practiceMap.id, (zooms[practiceMap.id] || 1) - 0.2)}
                  disabled={(zooms[practiceMap.id] || 1) <= 1}
                  aria-label={`Zoom out ${practiceMap.title} practice`}
                >
                  <Remove fontSize="small" />
                </IconButton>
                <Chip size="small" label={`${Math.round((zooms[practiceMap.id] || 1) * 100)}%`} />
                <IconButton
                  size="small"
                  onClick={() => changeZoom(practiceMap.id, (zooms[practiceMap.id] || 1) + 0.2)}
                  disabled={(zooms[practiceMap.id] || 1) >= 2}
                  aria-label={`Zoom in ${practiceMap.title} practice`}
                >
                  <Add fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => changeZoom(practiceMap.id, 1)}
                  aria-label={`Reset zoom ${practiceMap.title} practice`}
                >
                  <RestartAlt fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={refreshPractice}
                  aria-label={`Refresh ${practiceMap.title} practice`}
                >
                  <Refresh fontSize="small" />
                </IconButton>
                {result ? (
                  <Chip color="primary" label={`Marks: ${result.score} / ${result.total}`} />
                ) : (
                  <Chip variant="outlined" label="Fill on map" />
                )}
              </Stack>
            </Stack>

            <Box
              sx={{
                overflow: "auto",
                bgcolor: "#f8fbff",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1,
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  width: `${(zooms[practiceMap.id] || 1) * 100}%`,
                  minWidth: "100%",
                  maxWidth: "none",
                  aspectRatio: practiceMap.practiceAspectRatio,
                  bgcolor: "white",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={resolveAssetUrl(practiceMap.practiceImageUrl || practiceMap.imageUrl)}
                  alt={`${practiceMap.title} practice`}
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "fill",
                    opacity: 1,
                  }}
                />
                {practiceQuestions.map((question, index) => {
                  const checked = result?.checked.find((item) => item.id === question.id);
                  const borderColor = checked
                    ? checked.isCorrect
                      ? "success.main"
                      : "warning.main"
                    : "primary.main";

                  return (
                    <Box
                      key={question.id}
                      sx={{
                        position: "absolute",
                        left: `${question.x}%`,
                        top: `${question.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: { xs: 118, sm: 152 },
                      }}
                    >
                      <TextField
                        value={answers[question.id] || ""}
                        onChange={(event) => updateAnswer(question.id, event.target.value)}
                        fullWidth
                        size="small"
                        placeholder={`${index + 1}`}
                        disabled={Boolean(result)}
                        sx={{
                          bgcolor: "rgba(255,255,255,0.96)",
                          borderRadius: 1,
                          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
                          "& .MuiOutlinedInput-root": {
                            fontWeight: 800,
                            fontSize: { xs: 12, sm: 14 },
                            color: checked?.isCorrect ? "success.main" : "text.primary",
                            "& fieldset": {
                              borderColor,
                              borderWidth: checked ? 2 : 1,
                            },
                            "&:hover fieldset": {
                              borderColor,
                            },
                            "&.Mui-focused fieldset": {
                              borderColor,
                            },
                          },
                        }}
                      />
                      {checked ? (
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mt: 0.25,
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 1,
                            bgcolor: "rgba(255,255,255,0.95)",
                            fontWeight: 800,
                          }}
                          color={checked.isCorrect ? "success.main" : "warning.main"}
                        >
                          {checked.isCorrect ? `Correct +${question.marks}` : "Wrong"}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <Button
              variant="contained"
              onClick={submitPractice}
              disabled={Boolean(result)}
              fullWidth
              sx={{ mt: 1.5, fontWeight: 800 }}
            >
              {result ? `Result: ${result.score} / ${result.total} marks` : "Submit Practice"}
            </Button>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}
