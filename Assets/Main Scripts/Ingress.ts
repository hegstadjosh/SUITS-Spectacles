import { TSSData } from './TSS_Data';
import { validate } from "../SpectaclesInteractionKit/Utils/validate";
import { IngressSimulator } from './IngressSimulator';

interface StepState {
    [key: number]: boolean;
}

interface Steps {
    [key: number]: StepState;
}

@component
export class Ingress extends BaseScriptComponent {
    // UI Components
    @input EMU1_POWER!: SceneObject;
    @input EV1_SUPPLY!: SceneObject;
    @input EV1_WASTE!: SceneObject;
    @input EV2_SUPPLY!: SceneObject;
    @input EV2_WASTE!: SceneObject;
    @input EMU2_POWER!: SceneObject;
    @input EMU1_OXY!: SceneObject;
    @input EMU2_OXY!: SceneObject;
    @input O2_VENT!: SceneObject;
    @input DEPRESS_PUMP!: SceneObject;
    @input simulator!: IngressSimulator;  // Reference to the simulator
    @input text!: Text;

    private steps: Steps = {};

    // Access TSS data through simulator
    private get tss_obj(): TSSData {
        return this.simulator.tssData;
    }

    onAwake(): void {
        validate(this.simulator);
        print(`[Ingress] TSS data: ${JSON.stringify(this.tss_obj)}`);

        this.createEvent('UpdateEvent').bind(this.onUpdate.bind(this));

        this.initializeSteps();
    }

    onUpdate(): void {
        this.executeSteps();
    }

    private initializeSteps(): void {
        // Initialize UI components
        this.EMU1_POWER.enabled = false;
        this.EV1_SUPPLY.enabled = false;
        this.EV1_WASTE.enabled = false;
        this.EV2_SUPPLY.enabled = false;
        this.EV2_WASTE.enabled = false;
        this.EMU2_POWER.enabled = false;
        this.EMU1_OXY.enabled = false;
        this.EMU2_OXY.enabled = false;
        this.O2_VENT.enabled = false;
        this.DEPRESS_PUMP.enabled = false;

        // Initialize step states
        this.steps[1] = { 1: false, 2: false, 3: false };
        this.steps[2] = { 1: false, 2: false, 3: false };
        this.steps[3] = { 1: false, 2: false, 3: false, 4: false };
        this.steps[4] = { 1: false, 2: false };
    }

    private executeSteps(): void {
        // Step 1: Connect UIA to DCU and start Depress
        if (!this.isStepComplete(1)) {
            if (!this.steps[1][1]) {
                this.text.text = "Connect EV-1 UIA and DCU umbilical.";
                const eva1Power = this.tss_obj.uia?.uia.eva1_power;
                print(`Step 1.1 - eva1_power: ${eva1Power}`);
                this.EMU1_POWER.enabled = !eva1Power;
                if (!eva1Power) return;
                if (!this.dcu_batt_msg(true)) return;
                this.steps[1][1] = true;
            }

            if (!this.steps[1][2]) {
                this.steps[1][2] = true;
            }

            if (!this.steps[1][3]) {
                this.steps[1][3] = true;
            }
        }

        // Step 2: Vent O2 Tanks
        if (!this.isStepComplete(2)) {
            if (!this.steps[2][1]) {
                this.text.text = "Open O2 vent.";
                const oxyVent = this.tss_obj.uia?.uia.oxy_vent;
                print(`Step 2.1 - oxy_vent: ${oxyVent}`);
                this.O2_VENT.enabled = !oxyVent;
                if (!oxyVent) return;
                this.steps[2][1] = true;
            }

            if (!this.steps[2][2]) {
                const p1 = this.tss_obj.telemetry?.telemetry.eva1.oxy_pri_storage;
                const s1 = this.tss_obj.telemetry?.telemetry.eva1.oxy_sec_storage;
                print(`Step 2.2 - oxy_pri_storage: ${p1}, oxy_sec_storage: ${s1}`);
                this.text.text = `eva1 primary: ${p1} secondary: ${s1}`;
                const empty = (p1 ?? 0) < 10 && (s1 ?? 0) < 10;
                if (!empty) return;
                this.steps[2][2] = true;
            }

            if (!this.steps[2][3]) {
                this.text.text = "Close O2 vent.";
                const oxyVent = this.tss_obj.uia?.uia.oxy_vent;
                print(`Step 2.3 - oxy_vent: ${oxyVent}`);
                this.O2_VENT.enabled = oxyVent;
                if (oxyVent) return;
                this.steps[2][3] = true;
            }
        }

        // Step 3: Empty Water Tanks
        if (!this.isStepComplete(3)) {
            if (!this.steps[3][1]) {
                if (!this.dcu_pump_msg(true)) return;
                this.steps[3][1] = true;
            }

            if (!this.steps[3][2]) {
                this.text.text = "Open EV-1 waste water.";
                const waterWaste = this.tss_obj.uia?.uia.eva1_water_waste;
                print(`Step 3.2 - eva1_water_waste: ${waterWaste}`);
                this.EV1_WASTE.enabled = !waterWaste;
                if (!waterWaste) return;
                this.steps[3][2] = true;
            }

            if (!this.steps[3][3]) {
                const coolant = this.tss_obj.telemetry?.telemetry.eva1.coolant_ml;
                print(`Step 3.3 - coolant_ml: ${coolant}`);
                this.text.text = `Coolant: ${coolant}.`;
                if (coolant < 5) return;
                this.steps[3][3] = true;
            }

            if (!this.steps[3][4]) {
                this.text.text = "Close EV-1 waste water.";
                const waterWaste = this.tss_obj.uia?.uia.eva1_water_waste;
                print(`Step 3.4 - eva1_water_waste: ${waterWaste}`);
                this.EV1_WASTE.enabled = waterWaste;
                if (waterWaste) return;
                this.steps[3][4] = true;
            }
        }

        // Step 4: Disconnect UIA from DCU
        if (!this.isStepComplete(4)) {
            if (!this.steps[4][1]) {
                this.text.text = "Toggle EV-1 EMU PWR off.";
                const eva1Power = this.tss_obj.uia?.uia.eva1_power;
                print(`Step 4.1 - eva1_power: ${eva1Power}`);
                this.EMU1_POWER.enabled = eva1Power;
                if (eva1Power) return;
                this.steps[4][1] = true;
            }

            if (!this.steps[4][2]) {
                if (!this.dcu_batt_msg(false)) return;
                this.steps[4][2] = true;
                this.text.text = "Ingress Complete!";
            }
        }
    }

    private isStepComplete(step: number): boolean {
        return Object.values(this.steps[step]).every(value => value);
    }

    private dcu_batt_msg(mode: boolean): boolean {
        const modeText = mode ? "umbilical" : "local";
        const battState = this.tss_obj.dcu?.dcu.eva1.batt;
        print(`DCU batt check - current: ${battState}, expected: ${mode}`);
        if (battState !== mode) {
            this.text.text = `Switch DCU batt to ${modeText}. `;
            return false;
        }
        return true;
    }

    private dcu_oxy_msg(mode: boolean): boolean {
        const modeText = mode ? "primary" : "secondary";
        if (this.tss_obj.dcu?.dcu.eva1.oxy !== mode) {
            this.text.text = `Switch DCU oxy to ${modeText}. `;
            return false;
        }
        return true;
    }

    private dcu_comm_msg(mode: boolean): boolean {
        const modeText = mode ? "A" : "B";
        if (this.tss_obj.dcu?.dcu.eva1.comm !== mode) {
            this.text.text = `Switch DCU comm to ${modeText}. `;
            return false;
        }
        return true;
    }

    private dcu_fan_msg(mode: boolean): boolean {
        const modeText = mode ? "primary" : "secondary";
        if (this.tss_obj.dcu?.dcu.eva1.fan !== mode) {
            this.text.text = `Switch DCU fan to ${modeText}. `;
            return false;
        }
        return true;
    }

    private dcu_pump_msg(mode: boolean): boolean {
        const modeText = mode ? "open" : "closed";
        if (this.tss_obj.dcu?.dcu.eva1.pump !== mode) {
            this.text.text = `Switch DCU pump to ${modeText}. `;
            return false;
        }
        return true;
    }

    private dcu_co2_msg(mode: boolean): boolean {
        const modeText = mode ? "A" : "B";
        if (this.tss_obj.dcu?.dcu.eva1.co2 !== mode) {
            this.text.text = `Switch DCU co2 to ${modeText}. `;
            return false;
        }
        return true;
    }
} 