import { Box, Button, Flex, Heading, Link, Separator, Text, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FullBleedSection, ReadingColumn, touchTargetMin } from "./samples/radix-comparison-layout";

function SamplesIndex() {
  return (
    <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
      <Box style={{ minHeight: "100vh" }}>
        <FullBleedSection
          py="6"
          style={{
            background: "linear-gradient(180deg, var(--indigo-2) 0%, var(--color-background) 55%)",
          }}>
          <ReadingColumn>
            <Heading size="8" mb="2">
              Radix Themes — sample comparison
            </Heading>
            <Text color="gray" size="3" mb="5" style={{ maxWidth: "42rem" }}>
              Local-only previews:{" "}
              <strong>Radix Themes only</strong> (no Carbon, no main-app Tailwind). Each page demonstrates
              outer shell / reading column / full-bleed sections.
            </Text>
            <Flex direction="column" gap="3" align="start">
              <Button size="3" asChild style={touchTargetMin}>
                <Link href="/radix-sample-premium">Premium SaaS sample (light + dark “marketing” accents)</Link>
              </Button>
              <Button size="3" variant="outline" asChild style={touchTargetMin}>
                <Link href="/radix-sample-gov">Gov / enterprise sample (neutral, dense)</Link>
              </Button>
              <Separator size="4" my="2" />
              <Text size="2" color="gray">
                <Link href="/">← Main Simpero app</Link>
              </Text>
            </Flex>
          </ReadingColumn>
        </FullBleedSection>
      </Box>
    </Theme>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SamplesIndex />
  </StrictMode>
);
