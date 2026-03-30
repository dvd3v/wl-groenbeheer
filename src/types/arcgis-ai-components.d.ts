import type { DetailedHTMLProps, HTMLAttributes } from "react";

type WebComponentProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  ref?: unknown;
  [key: string]: unknown;
};

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "arcgis-map": WebComponentProps;
      "arcgis-assistant": WebComponentProps;
      "arcgis-assistant-data-exploration-agent": WebComponentProps;
      "arcgis-assistant-navigation-agent": WebComponentProps;
      "arcgis-assistant-help-agent": WebComponentProps;
    }
  }
}
