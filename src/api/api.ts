import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { StationDataVoltage } from "../pages/BsSchedule";

export interface StationData {
  BS_NAME: string;
  CA_4w: number;
  CA_52w: number;
}

export type DataResponse = StationData[];

export interface Comment {
  comment: string;
  date: string;
  site_name: string;
  status: string;
  type_failure: null | string;
  type_: string | null;
  type_a: string | null;
}

export interface WeekData {
  CA_2G: string | number;
  change_of_battery: string;
  combined_text: string | null;
  count_of_alarms: string;
  time_of_alarms: string;
  weak: string;
  weak_right: string | null;
}

export interface SiteInfo {
  comment: null | Comment[];
  site_info: WeekData[];
}

type VoltageValue = number | string;

interface VoltageData {
  [baseStation: string]: VoltageValue;
}

interface AlarmStatus {
  status?: string;
  [alarmType: string]: string | undefined;
}

interface AlarmsData {
  [baseStation: string]: AlarmStatus;
}

interface ApiResponseItem {
  voltage?: VoltageData;
  alarms?: AlarmsData;
}

export type ExternalApiResponse = ApiResponseItem[];

// Определите интерфейс для данных температуры
export interface TemperatureItem {
  [key: string]: number;
}

export interface StationDataTemp {
  BBU: TemperatureItem[];
  RRU: TemperatureItem[];
}

export interface StationTemp {
  [baseStation: string]: StationDataTemp;
}

export type TemperatureResponse = StationTemp[][];

export const Api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "https://10.77.28.241:430/" }),
  endpoints: (builder) => ({
    getBaseData: builder.query<DataResponse | undefined, void>({
      query: () => "top_rate",
    }),
    getBaseInfo: builder.query<SiteInfo | null, string>({
      query: (base) => `site_info/${base}`,
    }),
    addComment: builder.mutation<void, { base: string; comment: Comment }>({
      query: ({ base, comment }) => ({
        url: `site_info/${base}`,
        method: "POST",
        body: comment,
      }),
    }),
    getBaseVoltage: builder.query({
      query: (base) => `voltage/${base}`,
    }),
    getLastDataFromExternalApi: builder.query<ExternalApiResponse, void>({
      query: () => ({
        url: "https://10.77.28.241:5000/api/last_data",
        baseUrl: "",
      }),
    }),
    getBseVoltageInfo: builder.query<StationDataVoltage | null, string>({
      query: (base) => ({
        url: `https://10.77.28.241:430/graf_voltage/${base}`,
        baseUrl: "",
      }),
    }),
    getTemperatureData: builder.query<TemperatureResponse, void>({
      query: () => "all_temperature",
    }),
  }),
});

export const {
  useGetBaseDataQuery,
  useGetBaseInfoQuery,
  useAddCommentMutation,
  useLazyGetBaseVoltageQuery,
  useGetLastDataFromExternalApiQuery,
  useGetBseVoltageInfoQuery,
  useGetTemperatureDataQuery,
} = Api;
