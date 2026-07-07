import {
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Heading,
  Link,
  Table,
  Text,
  Theme,
  TextField,
} from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  FullBleedSection,
  ReadingColumn,
  touchTargetMin,
  WideBreakout,
} from "./samples/radix-comparison-layout";

function GovEnterpriseSample() {
  return (
    <Theme
      appearance="light"
      accentColor="indigo"
      grayColor="slate"
      radius="small"
      panelBackground="solid"
      scaling="100%">
      <Box>
        <FullBleedSection
          py="3"
          px="4"
          style={{
            background: "var(--gray-2)",
            borderBottom: "1px solid var(--gray-a6)",
          }}>
          <Flex
            justify="between"
            align="center"
            gap="4"
            wrap="wrap"
            width="100%"
            style={{ maxWidth: 1136, margin: "0 auto" }}>
            <Text size="2" weight="medium" style={{ fontVariantNumeric: "tabular-nums" }}>
              ER-2026-031 · Classification: CUI
            </Text>
            <Flex gap="2" wrap="wrap" align="center">
              <Text size="1" color="gray">
                Last saved 14:32 UTC
              </Text>
              <Button size="2" variant="surface" style={touchTargetMin}>
                Save draft
              </Button>
              <Button size="2" highContrast style={touchTargetMin}>
                Submit for review
              </Button>
            </Flex>
          </Flex>
        </FullBleedSection>

        <ReadingColumn>
          <Box py="6">
            <Callout.Root color="blue" mb="5">
              <Callout.Text size="2">
                <strong>Gov / enterprise sample.</strong> Higher information density, neutral accents,
                solid panels — same layout primitives (`FullBleedSection`, `ReadingColumn`,
                `WideBreakout`) as the premium page.
              </Callout.Text>
            </Callout.Root>

            <Heading size="6" mb="2">
              Memorandum — subject line placeholder
            </Heading>
            <Text size="2" color="gray" mb="5" style={{ maxWidth: "65ch" }}>
              Body copy respects a narrow measure for readability. References and jurisdiction notes stay
              in the reading column; operational tables break out below in a wider band.
            </Text>

            <Flex direction="column" gap="3" mb="6" style={{ maxWidth: "32rem" }}>
              <TextField.Root
                size="2"
                defaultValue="Director, Office of Records"
                aria-label="Addressee"
              />
              <Flex align="center" gap="2">
                <Checkbox defaultChecked aria-label="Include disposition table" id="disp" />
                <Text as="label" size="2" htmlFor="disp">
                  Include disposition table
                </Text>
              </Flex>
            </Flex>
          </Box>
        </ReadingColumn>

        <FullBleedSection py="5" style={{ background: "var(--gray-2)" }}>
          <WideBreakout>
            <Card size="2">
              <Heading size="4" mb="3">
                Review queue (dense)
              </Heading>
              <Box style={{ overflowX: "auto" }}>
                <Table.Root size="1" variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Reviewer</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Due</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {[
                      ["REQ-18402", "Legal", "A. Nguyen", "2026-04-02"],
                      ["REQ-18403", "Policy", "B. Okonkwo", "2026-04-04"],
                      ["REQ-18404", "Release", "C. Patel", "2026-04-05"],
                    ].map(([id, stage, reviewer, due]) => (
                      <Table.Row key={id}>
                        <Table.Cell>
                          <Text size="1" weight="medium">
                            {id}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1">{stage}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1">{reviewer}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {due}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card>
          </WideBreakout>
        </FullBleedSection>

        <ReadingColumn>
          <Box py="6">
            <Heading size="4" mb="3">
              Split breakout: status + checklist
            </Heading>
            <GridTwoUp />
            <Box pt="6">
              <Link href="/radix-samples" size="3">
                ← All Radix samples
              </Link>
            </Box>
          </Box>
        </ReadingColumn>
      </Box>
    </Theme>
  );
}

function GridTwoUp() {
  return (
    <Flex
      direction={{ initial: "column", md: "row" }}
      gap="4"
      width="100%"
      align="stretch">
      <Card size="2" style={{ flex: 1 }}>
        <Text weight="bold" size="2" mb="2">
          Determination
        </Text>
        <Text size="2" color="gray">
          Preliminary: no additional controls required pending final legal review.
        </Text>
      </Card>
      <Card size="2" style={{ flex: 1 }}>
        <Text weight="bold" size="2" mb="2">
          Checklist
        </Text>
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Checkbox defaultChecked aria-label="PII scan complete" id="c1" />
            <Text as="label" size="2" htmlFor="c1">
              PII scan complete
            </Text>
          </Flex>
          <Flex align="center" gap="2">
            <Checkbox aria-label="Retention rule mapped" id="c2" />
            <Text as="label" size="2" htmlFor="c2">
              Retention rule mapped
            </Text>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GovEnterpriseSample />
  </StrictMode>
);
