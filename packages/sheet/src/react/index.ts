"use client";

import { Body } from "./Body.tsx";
import { Close } from "./Close.tsx";
import { Content } from "./Content.tsx";
import { Description } from "./Description.tsx";
import { Handle } from "./Handle.tsx";
import { Header } from "./Header.tsx";
import { Overlay } from "./Overlay.tsx";
import { Portal } from "./Portal.tsx";
import { Sheet as Root } from "./Sheet.tsx";
import { Title } from "./Title.tsx";

export const Sheet = Object.assign(Root, {
  Portal,
  Overlay,
  Content,
  Handle,
  Header,
  Body,
  Title,
  Description,
  Close,
});

export type {
  SheetController,
  SheetElements,
  SheetOptions,
  SheetState,
} from "../core/sheet.ts";
export type { SnapPoint, SnapPointConfig, SnapValue } from "../core/snap.ts";
export type { BodyProps } from "./Body.tsx";
export type { CloseProps } from "./Close.tsx";
export type { ContentProps } from "./Content.tsx";
export type { DescriptionProps } from "./Description.tsx";
export type { HandleProps } from "./Handle.tsx";
export type { HeaderProps } from "./Header.tsx";
export type { OverlayProps } from "./Overlay.tsx";
export type { PortalProps } from "./Portal.tsx";
export type { SheetHandle, SheetProps } from "./Sheet.tsx";
export type { TitleProps } from "./Title.tsx";
export { useSheetState } from "./use-sheet-state.ts";
