import { useState } from "react";
import { Box, Container, Paper, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Map, Psychology, Spellcheck, Translate } from "@mui/icons-material";
import GrammarPanel from "../components/GrammarPanel";
import MapsPanel from "../components/MapsPanel";
import MeaningPanel from "../components/MeaningPanel";

const tabs = [
  { value: "grammar", label: "Grammar", icon: <Spellcheck /> },
  { value: "maps", label: "Maps", icon: <Map /> },
  { value: "meaning", label: "Meaning", icon: <Translate /> },
];

export default function MindScopePage() {
  const [activeTab, setActiveTab] = useState("grammar");

  return (
    <Container maxWidth="lg" sx={{ mt: 3, pb: 10 }}>
      <Stack spacing={3}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                flexShrink: 0,
              }}
            >
              <Psychology />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={900}>
                MindScope
              </Typography>
              <Typography color="text.secondary">
                Grammar, maps, and bilingual word meanings in one place.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: "1px solid", borderColor: "divider" }}
          >
            {tabs.map((tab) => (
              <Tab key={tab.value} value={tab.value} icon={tab.icon} iconPosition="start" label={tab.label} />
            ))}
          </Tabs>
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            {activeTab === "grammar" ? <GrammarPanel /> : null}
            {activeTab === "maps" ? <MapsPanel /> : null}
            {activeTab === "meaning" ? <MeaningPanel /> : null}
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}
