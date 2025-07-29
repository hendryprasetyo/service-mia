import * as Joi from 'joi';
import { latitudeString, longitudeString } from 'src/common/dtos/dto';

export const GetLocationDtoSchema = Joi.object({
  latitude: latitudeString.required(),
  longitude: longitudeString.required(),
  zoom: Joi.string().optional().allow(''),
});

export const GetRoutingDtoSchema = Joi.object({
  from: Joi.object({
    latitude: latitudeString.required(),
    longitude: longitudeString.required(),
  }).required(),
  to: Joi.object({
    latitude: latitudeString.required(),
    longitude: longitudeString.required(),
  }).required(),
  profile: Joi.string()
    .valid(
      'driving-car',
      'driving-hgv',
      'cycling-regular',
      'cycling-road',
      'cycling-mountain',
      'cycling-electric',
      'foot-walking',
      'foot-hiking',
      'wheelchair',
    )
    .required(),
  returnType: Joi.string().valid('json', 'geojson', 'gpx').optional().allow(''),
});

export const GetRecommendedAcomodationDtoSchema = Joi.object({
  from: Joi.object({
    latitude: latitudeString.required(),
    longitude: longitudeString.required(),
    country: Joi.string().required(),
  }).required(),
  to: Joi.object({
    latitude: latitudeString.required(),
    longitude: longitudeString.required(),
    country: Joi.string().required(),
  }).required(),
  typeAcomodation: Joi.string()
    .valid('all', 'airport', 'train', 'bus', 'harbor')
    .required(),
});

export const GetCityDtoSchema = Joi.object({
  province: Joi.string().optional().allow(''),
});

export type GetLocationDto = {
  latitude: string;
  longitude: string;
  zoom: string;
  format: string;
};

export type GetRoutingDto = {
  from: {
    latitude: string;
    longitude: string;
  };
  to: { latitude: string; longitude: string };
  profile: string;
  returnType?: string;
};

export type GetRecommendedAcomodationDto = {
  typeAcomodation: string;
  from: {
    latitude: string;
    longitude: string;
    country: string;
  };
  to: {
    latitude: string;
    longitude: string;
    country: string;
  };
};

export type GetCityDto = {
  province?: string;
};

export type Address = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
  ISO3166_2_lvl4?: string;
  postcode?: string;
  region?: string;
  country: string;
  country_code: string;
  regency?: string;
};

export type NominatimResponse = {
  place_id: number;
  licence: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name?: string;
  display_name: string;
  address: Address;
  boundingbox: [string, string, string, string];
};

export type CountryType = {
  WNI: string[];
  WNA: string[];
};

export type ProvinceType = string[];

export type CityType = {
  name: string;
  province: string;
  region: string;
}[];

export type ProvinceWithCoordinateType = {
  province: string;
  lat: string;
  long: string;
}[];

export type LaccimaCitiesType = string[];

export type AliasCityType = {
  city: string;
  alias: string;
}[];

export type AliasDistrictType = {
  district: string;
  alias: string;
}[];

export type AreaDataType = {
  countries: CountryType;
  provinces: ProvinceType;
  cities: CityType;
  provincesWithCoordinate: ProvinceWithCoordinateType;
  laccimaCities: LaccimaCitiesType;
  aliasesCities: AliasCityType;
  aliasesDistrict: AliasDistrictType;
};

export type CountryDataType = {
  name: string;
  alpha_2_code: string;
  calling_code: string;
  postal_code_format: string;
  flag: string;
  postal_code_regex: string;
  nationality: 'WNA' | 'WNI';
};

export type TGeoPoint = {
  latitude: string;
  longitude: string;
  color_hex_point_maps: string;
};

export type TAdministrativeArea = {
  province: string;
  province_code: string;
  city: string;
  city_code: string;
};

export type TContactInfo = {
  address?: string | null;
  kodepos: string | null;
  notelp: string;
  surel: string;
  metadata: string;
};

export type TIdentifiable = {
  objectid: number;
  namobj: string;
  type: string;
  fcode: string;
  srs_id: string;
  lcode: string;
  status: string;
  class: string | null;
};

export type TGenericAcomodationData<T> = {
  [country: string]: T[];
};

export type TBusStation = TGeoPoint &
  TAdministrativeArea &
  TContactInfo &
  TIdentifiable & {
    kode: string;
    pnylgr: string;
    operator: string;
    sk_tap_lok: string;
    tipe: string;
    lay_albn: string;
    lay_akap: string;
    lay_akdp: string;
    lay_angkot: string;
    lay_angdes: string;
    jml_pns: string;
    jml_ppns: string;
    jml_pkb: string;
    jml_regu: string;
    ls_lhn: string;
    ls_bng: string;
    ljr_kdt_bb: string;
    ljr_kdt_bs: string;
    ljr_kdt_bk: string;
    jur_kbt_bb: string;
    jur_kbt_bs: string;
    jur_kbt_bk: string;
    ljr_kdt: string;
    jur_kbt: string;
    tmpt_park_: string;
    peng_park: string;
    tipe_park: string;
    sdia_loket: string;
    sdia_toile: string | null;
    sdia_lkts: string;
    sdia_klini: string;
    sdia_atm: string;
    sdia_kanti: string;
  };

export type THarbor = TGeoPoint &
  TAdministrativeArea &
  TContactInfo &
  TIdentifiable & {
    kode: string;
    tipe_pp: string;
    nama_pp: string;
    sk_tap_rip: string;
    sk_tap_lok: string;
    izin_bng: string;
    thn_bng: string;
    izin_kmb: string;
    thn_kmb: string;
    izin_ops: string;
    thn_ops: string;
    aset: string | null;
    nilai_aset: string;
    klspel: number;
    stat_jln: string;
    kls_jln: string;
    pnj_jln: string;
    stat_rel: string;
    jml_pns: string;
    tipe_opera: string;
    operator: string;
    lintas: string;
    jns_kpl: string;
    hirrki: string;
    jml_dmg: string;
    pnj_dmg: string;
    dlm_klm: string;
    bbt_kapal: string;
    ls_lap_pmp: string;
    term_pnp: string;
    ls_trm_pnp: string;
    term_ptk: string;
    ls_trm_ptk: string;
    term_crhc: string;
    ls_crhc: string;
    term_crhk: string;
    ls_crhk: string;
    kap_lay_brg: string;
    ls_gdng_l1: string;
    ls_gdng_gp: string;
    ls_gdng_sc: string;
    ls_gdng_fd: string;
    ls_gdng_bd: string;
    ls_gdng_cd: string;
    ls_gdng_b3: string;
    ls_gdng_en: string;
    jml_bunker: string;
    kap_bunker: string;
    ls_kantor: string;
    ls_dag: string;
    kap_park: string;
    ls_park: string;
    ls_drh_krj_drt: string;
    ls_bng: string;
    ls_drh_krj_air: string;
    ls_drh_kep: string;
    remark: string;
    hirarki_p: string;
    kode_hirarki: string;
  };

export type TTrainStation = TGeoPoint &
  TAdministrativeArea &
  TContactInfo &
  TIdentifiable & {
    lcode: string;
    fgssta: string | null;
    konkon: string | null;
    klssta: string | null;
    remark: string | null;
    dopsta: string | null;
    wilsta: string;
    kmtsta: string;
    kodkod: string;
    bt: string | null;
    linsta: string | null;
    sk_tap_ripn: string | null;
    operator: string;
    stat_ops: number | null;
    thn_bng: number | null;
    thn_ops: number | null;
    thn_tup: number | null;
    kls_sta: string | null;
    lay_ka_pnp: string | null;
    lay_ka_eks: string | null;
    lay_ka_bis: string | null;
    lay_ka_eko: string | null;
    lay_ka_kom: string | null;
    lay_ka_brg: string | null;
    jml_ppka: string | null;
    wilker: string | null;
    thndt: string | null;
    ls_lhn: string | null;
    ls_bng: string | null;
    peron_pnj: string | null;
    peron_lbr: string | null;
    jalur_rel: string | null;
    jalur_lbr: string | null;
    rel_pnj: string | null;
    kap_park: string | null;
    ls_park: string | null;
    ls_gdng: string | null;
    jml_toilet: string | null;
    jml_klinik: string | null;
    ls_kantin: string | null;
    persinyalan: string | null;
    emplasemen: string | null;
    kaplin: string | null;
    jmlh_lkt: string | null;
    elevasi: number | null;
    r_tunggu: string | null;
    wil_op: number;
    shape: string;
    daop_divre: string;
    fungsi: string | null;
    kondisi: string | null;
    status_operasi: string;
  };

export type TAirport = TGeoPoint &
  TAdministrativeArea &
  TContactInfo &
  TIdentifiable & {
    tiplok: number;
    klsbmi: number;
    funaip: number;
    tipaip: string | null;
    kepaip: string | null;
    hiraip: number;
    adabmi: string;
    kataip: number;
    elevas: number | null;
    remark: string | null;
    mavbmi: string | null;
    kdicao: string | null;
    adrbmi: string;
    kdiata: string;
    lgtbmi: string | null;
    azimuth: string;
    jamopr: string;
    pcnaip: string;
    jnspsw: string;
    klsfks: string;
    dmnsrw: string;
    txway: string;
    apron: string;
    trmndm: string;
    lcode: string | null;
    sk_tap_rinb: string | null;
    sk_tap_lok: string | null;
    sk_tap_bng: string | null;
    sk_tap_ops: string | null;
    stat_ops: number | null;
    nama_otban: string | null;
    aset: string | null;
    stat_jln: string | null;
    kls_jln: string | null;
    pnj_jln: string | null;
    jml_pns: string | null;
    elevasi: number | null;
    ls_dlkr: string | null;
    ls_bng: string | null;
    jml_rnwy: string | null;
    jml_txwy: string | null;
    jml_apr_wb: string | null;
    jml_apr_nb: string | null;
    jml_hgr: string | null;
    ls_trmpnp: string | null;
    ls_trmkrg: string | null;
    ls_kantor: string | null;
    ls_par: string | null;
    kap_park: string | null;
    ls_park: string | null;
    shape: string;
    hirarki: string;
    category: string;
    lokasi: string;
    tipe: string;
    kepentingan: string;
    fungsi: string;
  };

export type TAcomodation = TTrainStation | TAirport | TBusStation | THarbor;
