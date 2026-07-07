import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Column,
  ContentSwitcher,
  Grid,
  Heading,
  Layer,
  Link,
  Search,
  Stack,
  Switch,
  Tag,
  TextInput,
  Theme,
  Tile,
  Toggle,
} from "@carbon/react";
import "@carbon/styles/css/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function CarbonSampleApp() {
  const [theme, setTheme] = useState<"g100" | "white">("g100");
  const [annexOn, setAnnexOn] = useState(true);

  return (
    <Theme theme={theme}>
      <Layer>
        <Grid style={{ minHeight: "100vh", paddingBlock: "2rem" }}>
          <Column lg={12} md={6} sm={4}>
            <Stack gap={6}>
              <Breadcrumb noTrailingSlash>
                <BreadcrumbItem href="/">Simpero</BreadcrumbItem>
                <BreadcrumbItem isCurrentPage>Carbon sample</BreadcrumbItem>
              </Breadcrumb>
              <Heading>Carbon + Vite (isolated page)</Heading>
              <p className="cds--type-body-01" style={{ maxWidth: "42rem" }}>
                This entry does not load the main Tailwind app styles — only{" "}
                <Link href="https://github.com/carbon-design-system/carbon" inline>
                  @carbon/react
                </Link>
                . Open the main app in another tab to compare. Local dev URL:{" "}
                <code className="cds--code-snippet-single">/carbon-sample</code>
              </p>
              <Stack orientation="horizontal" gap={4}>
                <Button kind="primary">Primary</Button>
                <Button kind="secondary">Secondary</Button>
                <Button kind="tertiary">Tertiary</Button>
                <Button kind="ghost">Ghost</Button>
              </Stack>
              <ContentSwitcher
                selectedIndex={theme === "g100" ? 0 : 1}
                onChange={(params) => {
                  const i = params.index;
                  if (typeof i !== "number") return;
                  setTheme(i === 0 ? "g100" : "white");
                }}>
                <Switch name="g100" text="Theme g100" />
                <Switch name="white" text="Theme white" />
              </ContentSwitcher>
              <Tile>
                <Stack gap={5}>
                  <TextInput
                    id="sample-title"
                    labelText="Memo title"
                    placeholder="e.g. Quarterly baseline review"
                    helperText="Carbon form field spacing and typography."
                  />
                  <Search labelText="Search" placeholder="Find in corpus…" size="lg" />
                  <Stack orientation="horizontal" gap={3}>
                    <Tag type="blue">Draft</Tag>
                    <Tag type="green">Verified</Tag>
                    <Tag type="warm-gray">Internal</Tag>
                  </Stack>
                  <Toggle
                    id="annex-toggle"
                    labelText="Include annex"
                    toggled={annexOn}
                    onToggle={setAnnexOn}
                  />
                </Stack>
              </Tile>
              <Link href="/">← Back to main app</Link>
            </Stack>
          </Column>
        </Grid>
      </Layer>
    </Theme>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CarbonSampleApp />
  </StrictMode>
);
