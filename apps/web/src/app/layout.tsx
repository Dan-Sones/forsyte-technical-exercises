import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ask Forsyte',
  description: 'Ask Forsyte about your matters and risk assessments.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let the on-screen keyboard shrink the layout so the composer stays visible.
  interactiveWidget: 'resizes-content',
};

// ThemeProvider sets data-colour-mode in an effect, after the first paint.
// Setting it here first stops dark-mode users seeing a flash of light theme.
const setColourModeBeforePaint = `(function () {
  try {
    var root = document.documentElement;
    root.dataset.colourScheme = 'yellow';
    root.dataset.colourMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: setColourModeBeforePaint }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
