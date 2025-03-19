import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
export const Api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "https://10.77.28.213:430/" }),
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
      query: (base) => `voltage/${base}`
    })
  }),
});

export const {
  useGetBaseDataQuery,
  useGetBaseInfoQuery,
  useAddCommentMutation,
  useLazyGetBaseVoltageQuery
} = Api;
