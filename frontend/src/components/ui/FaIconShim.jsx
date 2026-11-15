import React from "react";
import { resolveFaClass } from "./Icon";

export function createIcon(name) {
  const IconComponent = React.forwardRef(({
    size = 16,
    color = "currentColor",
    className = "",
    style = {},
    strokeWidth,
    fill,
    ...props
  }, ref) => {
    const faClass = resolveFaClass(name);
    const isSpin = className.includes("spin") || (typeof name === "string" && name.toLowerCase().includes("spin"));
    const pxSize = typeof size === "number" ? `${size}px` : size;

    return (
      <i
        ref={ref}
        className={`${faClass} ${isSpin ? "fa-spin" : ""} ${className}`}
        style={{
          fontSize: pxSize,
          color: color || "currentColor",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          width: pxSize,
          height: pxSize,
          verticalAlign: "middle",
          ...style,
        }}
        aria-hidden="true"
        {...props}
      />
    );
  });

  IconComponent.displayName = name;
  return IconComponent;
}

// Standard Lucide icons mapped to authentic FontAwesome
export const Home = createIcon("Home");
export const Bot = createIcon("Bot");
export const Search = createIcon("Search");
export const Share2 = createIcon("Share2");
export const Activity = createIcon("Activity");
export const LayoutDashboard = createIcon("LayoutDashboard");
export const AlertTriangle = createIcon("AlertTriangle");
export const AlertCircle = createIcon("AlertCircle");
export const Info = createIcon("Info");
export const BarChart = createIcon("BarChart");
export const BarChart2 = createIcon("BarChart2");
export const BarChart3 = createIcon("BarChart3");
export const PieChart = createIcon("PieChart");
export const FolderOpen = createIcon("FolderOpen");
export const Folder = createIcon("Folder");
export const FolderSync = createIcon("FolderSync");
export const ClipboardList = createIcon("ClipboardList");
export const Database = createIcon("Database");
export const Settings = createIcon("Settings");
export const ChevronLeft = createIcon("ChevronLeft");
export const ChevronRight = createIcon("ChevronRight");
export const ChevronDown = createIcon("ChevronDown");
export const ChevronUp = createIcon("ChevronUp");
export const ChevronsLeft = createIcon("ChevronsLeft");
export const ChevronsRight = createIcon("ChevronsRight");
export const ChevronsUpDown = createIcon("ChevronsUpDown");
export const Bell = createIcon("Bell");
export const UploadCloud = createIcon("UploadCloud");
export const CloudUpload = createIcon("CloudUpload");
export const Download = createIcon("Download");
export const CloudDownload = createIcon("CloudDownload");
export const Moon = createIcon("Moon");
export const Sun = createIcon("Sun");
export const Globe = createIcon("Globe");
export const LogOut = createIcon("LogOut");
export const Check = createIcon("Check");
export const CheckCheck = createIcon("CheckCheck");
export const CheckCircle = createIcon("CheckCircle");
export const CheckCircle2 = createIcon("CheckCircle2");
export const CheckSquare = createIcon("CheckSquare");
export const Shield = createIcon("Shield");
export const ShieldCheck = createIcon("ShieldCheck");
export const ShieldAlert = createIcon("ShieldAlert");
export const Building = createIcon("Building");
export const Building2 = createIcon("Building2");
export const ArrowRight = createIcon("ArrowRight");
export const ArrowLeft = createIcon("ArrowLeft");
export const ArrowUp = createIcon("ArrowUp");
export const ArrowDown = createIcon("ArrowDown");
export const ArrowUpRight = createIcon("ArrowUpRight");
export const Sparkles = createIcon("Sparkles");
export const Wand2 = createIcon("Wand2");
export const FileText = createIcon("FileText");
export const File = createIcon("File");
export const FileEdit = createIcon("FileEdit");
export const FileSpreadsheet = createIcon("FileSpreadsheet");
export const FileCode = createIcon("FileCode");
export const FilePlus = createIcon("FilePlus");
export const FileCheck = createIcon("FileCheck");
export const RefreshCw = createIcon("RefreshCw");
export const RotateCw = createIcon("RotateCw");
export const RotateCcw = createIcon("RotateCcw");
export const MessageSquare = createIcon("MessageSquare");
export const MessagesSquare = createIcon("MessagesSquare");
export const DollarSign = createIcon("DollarSign");
export const Clock = createIcon("Clock");
export const Hourglass = createIcon("Hourglass");
export const TrendingDown = createIcon("TrendingDown");
export const TrendingUp = createIcon("TrendingUp");
export const ExternalLink = createIcon("ExternalLink");
export const Trash2 = createIcon("Trash2");
export const Trash = createIcon("Trash");
export const Edit = createIcon("Edit");
export const Edit3 = createIcon("Edit3");
export const Copy = createIcon("Copy");
export const Plus = createIcon("Plus");
export const PlusCircle = createIcon("PlusCircle");
export const Minus = createIcon("Minus");
export const X = createIcon("X");
export const Eye = createIcon("Eye");
export const EyeOff = createIcon("EyeOff");
export const Filter = createIcon("Filter");
export const FilterX = createIcon("FilterX");
export const Network = createIcon("Network");
export const SlidersHorizontal = createIcon("SlidersHorizontal");
export const Sliders = createIcon("Sliders");
export const Maximize2 = createIcon("Maximize2");
export const Minimize2 = createIcon("Minimize2");
export const Lock = createIcon("Lock");
export const Unlock = createIcon("Unlock");
export const Key = createIcon("Key");
export const KeyRound = createIcon("KeyRound");
export const Send = createIcon("Send");
export const Inbox = createIcon("Inbox");
export const User = createIcon("User");
export const Users = createIcon("Users");
export const UserCheck = createIcon("UserCheck");
export const UserPlus = createIcon("UserPlus");
export const Terminal = createIcon("Terminal");
export const Layers = createIcon("Layers");
export const Grid = createIcon("Grid");
export const LayoutGrid = createIcon("LayoutGrid");
export const List = createIcon("List");
export const ListOrdered = createIcon("ListOrdered");
export const Link = createIcon("Link");
export const Tag = createIcon("Tag");
export const Mail = createIcon("Mail");
export const Phone = createIcon("Phone");
export const Server = createIcon("Server");
export const Star = createIcon("Star");
export const Calendar = createIcon("Calendar");
export const HelpCircle = createIcon("HelpCircle");
export const CircleHelp = createIcon("CircleHelp");
export const PanelLeft = createIcon("PanelLeft");
export const Menu = createIcon("Menu");
export const Loader2 = createIcon("Loader2");
export const Paperclip = createIcon("Paperclip");
export const Award = createIcon("Award");
export const Lightbulb = createIcon("Lightbulb");
export const Printer = createIcon("Printer");
export const Quote = createIcon("Quote");
export const Brain = createIcon("Brain");
export const ZoomIn = createIcon("ZoomIn");
export const ZoomOut = createIcon("ZoomOut");
export const HardDrive = createIcon("HardDrive");
export const Table = createIcon("Table");
export const Play = createIcon("Play");
export const BookOpen = createIcon("BookOpen");
export const ThumbsUp = createIcon("ThumbsUp");
export const ThumbsDown = createIcon("ThumbsDown");
export const Bookmark = createIcon("Bookmark");
export const Pin = createIcon("Pin");
export const Ban = createIcon("Ban");
export const ShoppingCart = createIcon("ShoppingCart");
export const Scale = createIcon("Scale");
export const Save = createIcon("Save");
export const Cpu = createIcon("Cpu");
export const FlaskConical = createIcon("FlaskConical");
export const Crown = createIcon("Crown");
export const XCircle = createIcon("XCircle");
export const Laptop = createIcon("Laptop");

const proxyHandler = {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === "string" && prop !== "__esModule" && prop !== "default") {
      target[prop] = createIcon(prop);
      return target[prop];
    }
    return undefined;
  }
};

export default new Proxy({
  Home, Bot, Search, Share2, Activity, LayoutDashboard, AlertTriangle, AlertCircle, Info,
  BarChart, BarChart2, BarChart3, PieChart, FolderOpen, Folder, FolderSync, ClipboardList,
  Database, Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChevronsLeft,
  ChevronsRight, ChevronsUpDown, Bell, UploadCloud, CloudUpload, Download, CloudDownload,
  Moon, Sun, Globe, LogOut, Check, CheckCheck, CheckCircle, CheckCircle2, CheckSquare,
  Shield, ShieldCheck, ShieldAlert, Building, Building2, ArrowRight, ArrowLeft, ArrowUp,
  ArrowDown, ArrowUpRight, Sparkles, Wand2, FileText, File, FileEdit, FileSpreadsheet,
  FileCode, FilePlus, FileCheck, RefreshCw, RotateCw, RotateCcw, MessageSquare,
  MessagesSquare, DollarSign, Clock, Hourglass, TrendingDown, TrendingUp, ExternalLink,
  Trash2, Trash, Edit, Edit3, Copy, Plus, PlusCircle, Minus, X, Eye, EyeOff, Filter,
  FilterX, Network, SlidersHorizontal, Sliders, Maximize2, Minimize2, Lock, Unlock, Key,
  KeyRound, Send, Inbox, User, Users, UserCheck, UserPlus, Terminal, Layers, Grid,
  LayoutGrid, List, ListOrdered, Link, Tag, Mail, Phone, Server, Star, Calendar,
  HelpCircle, CircleHelp, PanelLeft, Menu, Loader2, Paperclip, Award, Lightbulb,
  Printer, Quote, Brain, ZoomIn, ZoomOut, HardDrive, Table, Play, BookOpen, ThumbsUp,
  ThumbsDown, Bookmark, Pin, Ban, ShoppingCart, Scale, Save, Cpu, FlaskConical, Crown
}, proxyHandler);

