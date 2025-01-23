// Data interfaces for TSS JSON structures
export interface UIAData {
    uia: {
        eva1_power: boolean;
        eva1_oxy: boolean;
        eva1_water_supply: boolean;
        eva1_water_waste: boolean;
        eva2_power: boolean;
        eva2_oxy: boolean;
        eva2_water_supply: boolean;
        eva2_water_waste: boolean;
        oxy_vent: boolean;
        depress: boolean;
    };
}

export interface TelemetryData {
    telemetry: {
        eva_time: number;
        eva1: EvaData;
        eva2: EvaData;
    };
}

interface EvaData {
    batt_time_left: number;
    oxy_pri_storage: number;
    oxy_sec_storage: number;
    oxy_pri_pressure: number;
    oxy_sec_pressure: number;
    oxy_time_left: number;
    heart_rate: number;
    oxy_consumption: number;
    co2_production: number;
    suit_pressure_oxy: number;
    suit_pressure_co2: number;
    suit_pressure_other: number;
    suit_pressure_total: number;
    fan_pri_rpm: number;
    fan_sec_rpm: number;
    helmet_pressure_co2: number;
    scrubber_a_co2_storage: number;
    scrubber_b_co2_storage: number;
    temperature: number;
    coolant_ml: number;
    coolant_gas_pressure: number;
    coolant_liquid_pressure: number;
}

export interface SpecData {
    spec: {
        eva1: EvaSpec;
        eva2: EvaSpec;
    };
}

interface EvaSpec {
    name: string;
    id: number;
    data: {
        SiO2: number;
        TiO2: number;
        Al2O3: number;
        FeO: number;
        MnO: number;
        MgO: number;
        CaO: number;
        K2O: number;
        P2O3: number;
    };
}

export interface RoverData {
    rover: {
        posx: number;
        posy: number;
        qr_id: number;
    };
}

export interface IMUData {
    dcu: {
        eva1: IMUEvaData;
        eva2: IMUEvaData;
    };
}

interface IMUEvaData {
    posx: number;
    posy: number;
    heading: number;
}

export interface DCUData {
    dcu: {
        eva1: DCUEvaData;
        eva2: DCUEvaData;
    };
}

interface DCUEvaData {
    batt: boolean;
    oxy: boolean;
    comm: boolean;
    fan: boolean;
    pump: boolean;
    co2: boolean;
}

export interface COMMData {
    comm: {
        comm_tower: boolean;
    };
}

// TSS Data Manager class
@component
export class TSSData extends BaseScriptComponent {
    // Data properties
    public uia: UIAData | null = null;
    public dcu: DCUData | null = null;
    public rover: RoverData | null = null;
    public spec: SpecData | null = null;
    public telemetry: TelemetryData | null = null;
    public comm: COMMData | null = null;
    public imu: IMUData | null = null;
    public duringEVA: boolean = false;

    // Update handlers for each data type
    public onUIAUpdate(jsonString: string): void {
        this.uia = JSON.parse(jsonString);
    }

    public onDCUUpdate(jsonString: string): void {
        this.dcu = JSON.parse(jsonString);
    }

    public onROVERUpdate(jsonString: string): void {
        this.rover = JSON.parse(jsonString);
    }

    public onSPECUpdate(jsonString: string): void {
        this.spec = JSON.parse(jsonString);
    }

    public onTELEMETRYUpdate(jsonString: string): void {
        this.telemetry = JSON.parse(jsonString);
    }

    public onCOMMUpdate(jsonString: string): void {
        this.comm = JSON.parse(jsonString);
    }

    public onIMUUpdate(jsonString: string): void {
        this.imu = JSON.parse(jsonString);
    }
} 