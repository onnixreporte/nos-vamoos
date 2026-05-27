export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaInsightsRow {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  campaign_name?: string;
  objective?: string;
  publisher_platform?: string;
  platform_position?: string;
  actions?: MetaAction[];
  cost_per_action_type?: MetaAction[];
}

export interface MetaInsightsResponse {
  data: MetaInsightsRow[];
  paging?: {
    next?: string;
    previous?: string;
    cursors?: { before?: string; after?: string };
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}
