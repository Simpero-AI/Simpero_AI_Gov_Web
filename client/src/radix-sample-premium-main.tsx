import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Link,
  SegmentedControl,
  Separator,
  Text,
  Theme,
  TextField,
} from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  FullBleedSection,
  ReadingColumn,
  touchTargetMin,
  WideBreakout,
} from "./samples/radix-comparison-layout";

function PremiumSample() {
  const [scheme, setScheme] = useState<"light" | "dark">("light");
  const isDark = scheme === "dark";

  const heroBackground = isDark
    ? "linear-gradient(145deg, #1a0a12 0%, #2d1520 35%, var(--color-background) 75%)"
    : "linear-gradient(145deg, #fff8f5 0%, #ffe8ee 40%, #faf7f2 85%)";

  return (
    <Theme
      appearance={scheme}
      accentColor={isDark ? "ruby" : "pink"}
      grayColor={isDark ? "mauve" : "sand"}
      radius="large"
      panelBackground="translucent">
      <Box>
        <FullBleedSection
          py="4"
          px="4"
          style={{
            borderBottom: "1px solid var(--gray-a6)",
            background: "var(--color-panel)",
          }}>
          <Flex justify="between" align="center" gap="4" wrap="wrap">
            <Text weight="bold" size="3">
              Premium SaaS shell
            </Text>
            <SegmentedControl.Root
              value={scheme}
              onValueChange={(v) => v && setScheme(v as "light" | "dark")}
              size="2">
              <SegmentedControl.Item value="light">Light</SegmentedControl.Item>
              <SegmentedControl.Item value="dark">Dark</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Flex>
        </FullBleedSection>

        <FullBleedSection py="9" style={{ background: heroBackground }}>
          <ReadingColumn>
            <Badge size="2" mb="3" color={isDark ? "ruby" : "pink"}>
              Sampling · Radix Themes
            </Badge>
            <Heading size="9" mb="3" style={{ letterSpacing: "-0.02em", maxWidth: "18ch" }}>
              Start building your narrative now
            </Heading>
            <Text size="4" color="gray" mb="5" style={{ maxWidth: "36rem" }}>
              Warm light palette and burgundy-dark mode inspired by Radix marketing: full-bleed hero,
              then a constrained reading column for substance.
            </Text>
            <Flex gap="3" wrap="wrap">
              <Button size="3" highContrast style={touchTargetMin}>
                Primary action
              </Button>
              <Button size="3" variant="outline" style={touchTargetMin}>
                Secondary
              </Button>
            </Flex>
          </ReadingColumn>
        </FullBleedSection>

        <ReadingColumn>
          <Box py="8">
            <Heading size="6" mb="3">
              Reading column (forms + copy)
            </Heading>
            <Text size="3" mb="4" color="gray" style={{ maxWidth: "65ch" }}>
              Line length stays comfortable: inner content uses a token-based `Container`, not ad-hoc
              max-width margins. Primary controls use at least ~44px touch targets.
            </Text>
            <Flex direction="column" gap="4" mb="6" style={{ maxWidth: "28rem" }}>
              <TextField.Root size="3" placeholder="Workspace name" aria-label="Workspace name" />
              <TextField.Root
                size="3"
                placeholder="Goal for this quarter"
                aria-label="Goal for this quarter"
              />
            </Flex>
            <Separator size="4" my="6" />
            <Heading size="5" mb="4">
              Breakout: wider canvas (data / viz)
            </Heading>
          </Box>
        </ReadingColumn>

        <FullBleedSection py="6" style={{ background: "var(--gray-a2)" }}>
          <WideBreakout>
            <Card size="3">
              <Text weight="bold" mb="3">
                Signal mix (illustrative)
              </Text>
              <Grid columns={{ initial: "1", sm: "3" }} gap="4" width="100%">
                {[
                  { label: "Latency", pct: 72, accent: "var(--accent-9)" },
                  { label: "Coverage", pct: 91, accent: "var(--pink-9)" },
                  { label: "Drift", pct: 38, accent: "var(--ruby-9)" },
                ].map((row) => (
                  <Box key={row.label}>
                    <Flex justify="between" mb="2">
                      <Text size="2">{row.label}</Text>
                      <Text size="2" weight="medium">
                        {row.pct}%
                      </Text>
                    </Flex>
                    <Box
                      height="8px"
                      style={{
                        borderRadius: 999,
                        background: "var(--gray-a4)",
                        overflow: "hidden",
                      }}>
                      <Box height="100%" style={{ width: `${row.pct}%`, background: row.accent }} />
                    </Box>
                  </Box>
                ))}
              </Grid>
            </Card>
          </WideBreakout>
        </FullBleedSection>

        <ReadingColumn>
          <Box py="8">
            <Link href="/radix-samples" size="3">
              ← All Radix samples
            </Link>
          </Box>
        </ReadingColumn>
      </Box>
    </Theme>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PremiumSample />
  </StrictMode>
);
