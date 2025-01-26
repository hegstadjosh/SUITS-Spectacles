import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import { validate } from "../SpectaclesInteractionKit/Utils/validate";
import { TSSData } from './TSS_Data';

@component
export class IngressSimulator extends BaseScriptComponent {
    @input nextButton!: Interactable;
    @input prevButton!: Interactable;
    @input statusText!: Text;
    @input tssData!: TSSData;  // This should be the same TSSData instance that Ingress.ts uses

    private currentStep: number = 1;
    private currentSubStep: number = 1;
    private readonly steps: { [key: number]: { [key: number]: string } } = {
        1: {
            1: "Step 1.1: Connect EV-1 UIA and DCU umbilical",
            2: "Step 1.2: EV-1 EMU Power ON",
            3: "Step 1.3: Set BATT to UMB"
        },
        2: {
            1: "Step 2.1: Open O2 vent",
            2: "Step 2.2: Waiting for O2 tanks to drop below 10psi...",
            3: "Step 2.3: Close O2 vent"
        },
        3: {
            1: "Step 3.1: Open DCU pump",
            2: "Step 3.2: Open EV-1 waste water",
            3: "Step 3.3: Waiting for coolant to drop below 5%...",
            4: "Step 3.4: Close EV-1 waste water"
        },
        4: {
            1: "Step 4.1: Toggle EV-1 EMU Power OFF",
            2: "Step 4.2: Disconnect UIA umbilical"
        }
    };

    onAwake(): void {
        validate(this.nextButton);
        validate(this.prevButton);
        validate(this.statusText);
        validate(this.tssData);

        print("[IngressSimulator] Starting initialization");
        // Initialize the simulated TSS data
        this.initializeTSSData();

        // Bind button events
        this.nextButton.onTriggerEnd.add(() => this.nextStep());
        this.prevButton.onTriggerEnd.add(() => this.previousStep());

        // Initialize display
        this.updateDisplay();
        //this.createEvent('UpdateEvent').bind(this.updateDisplay.bind(this))
        print("[IngressSimulator] Initialization complete");
    }

    private initializeTSSData(): void {
        // Create initial TSS data state
        const initialUIAData = {
            uia: {
                eva1_power: false,
                eva1_oxy: false,
                eva1_water_supply: false,
                eva1_water_waste: false,
                eva2_power: false,
                eva2_oxy: false,
                eva2_water_supply: false,
                eva2_water_waste: false,
                oxy_vent: false,
                depress: false
            }
        };

        const initialDCUData = {
            dcu: {
                eva1: {
                    batt: false,  // Start on local battery
                    oxy: false,
                    comm: false,
                    fan: false,
                    pump: false,
                    co2: false
                },
                eva2: {
                    batt: false,
                    oxy: false,
                    comm: false,
                    fan: false,
                    pump: false,
                    co2: false
                }
            }
        };

        const initialTelemetryData = {
            telemetry: {
                eva1: {
                    oxy_pri_storage: 100,  // Start with full tanks
                    oxy_sec_storage: 100,
                    coolant_ml: 100  // Start with full coolant
                },
                eva2: {
                    oxy_pri_storage: 100,
                    oxy_sec_storage: 100,
                    coolant_ml: 100
                }
            }
        };

        // Initialize the TSS data that will be shared with Ingress.ts
        print("[IngressSimulator] Initializing UIA data");
        this.tssData.onUIAUpdate(JSON.stringify(initialUIAData));
        print("[IngressSimulator] Initializing DCU data");
        this.tssData.onDCUUpdate(JSON.stringify(initialDCUData));
        print("[IngressSimulator] Initializing Telemetry data");
        this.tssData.onTELEMETRYUpdate(JSON.stringify(initialTelemetryData));
        print("[IngressSimulator] TSS data initialized");
    }

    private nextStep(): void {
        print(`[IngressSimulator] Moving to next step from ${this.currentStep}.${this.currentSubStep}`);
        const currentStepObj = this.steps[this.currentStep];
        const maxSubSteps = Object.keys(currentStepObj).length;

        if (this.currentSubStep < maxSubSteps) {
            this.currentSubStep++;
        } else if (this.currentStep < Object.keys(this.steps).length) {
            this.currentStep++;
            this.currentSubStep = 1;
        }

        print(`[IngressSimulator] Now at step ${this.currentStep}.${this.currentSubStep}`);
        this.simulateStepCompletion();
        this.updateDisplay();
    }

    private previousStep(): void {
        print(`[IngressSimulator] Moving to previous step from ${this.currentStep}.${this.currentSubStep}`);
        if (this.currentSubStep > 1) {
            this.currentSubStep--;
        } else if (this.currentStep > 1) {
            this.currentStep--;
            this.currentSubStep = Object.keys(this.steps[this.currentStep]).length;
        }

        print(`[IngressSimulator] Now at step ${this.currentStep}.${this.currentSubStep}`);
        this.simulateStepCompletion();
        this.updateDisplay();
    }

    private updateDisplay(): void {
        const stepMessage = this.steps[this.currentStep][this.currentSubStep];
        const progress = this.calculateProgress();
        this.statusText.text = `${stepMessage}\n\nProgress: ${progress}%`;
    }

    private calculateProgress(): number {
        let totalSteps = 0;
        let completedSteps = 0;

        for (const step of Object.values(this.steps)) {
            totalSteps += Object.keys(step).length;
        }

        for (let s = 1; s < this.currentStep; s++) {
            completedSteps += Object.keys(this.steps[s]).length;
        }
        completedSteps += this.currentSubStep;

        return Math.round((completedSteps / totalSteps) * 100);
    }

    private simulateStepCompletion(): void {
        // Get current state
        if (!this.tssData || !this.tssData.uia || !this.tssData.dcu || !this.tssData.telemetry) {
            print("[IngressSimulator] ERROR: TSS data or its components are undefined!");
            return;
        }

        const currentUIAState = this.tssData.uia.uia;
        const currentDCUState = this.tssData.dcu.dcu;
        const currentTelemetryState = this.tssData.telemetry.telemetry;

        if (!currentUIAState || !currentDCUState || !currentTelemetryState) {
            print("[IngressSimulator] ERROR: One or more states are undefined!");
            return;
        }

        print(`[IngressSimulator] Current states before update:
            UIA: eva1_power=${currentUIAState.eva1_power}, oxy_vent=${currentUIAState.oxy_vent}, eva1_water_waste=${currentUIAState.eva1_water_waste}
            DCU: batt=${currentDCUState.eva1.batt}, pump=${currentDCUState.eva1.pump}
            Telemetry: oxy_pri=${currentTelemetryState.eva1.oxy_pri_storage}, coolant=${currentTelemetryState.eva1.coolant_ml}`);

        // Update states based on current step
        switch (this.currentStep) {
            case 1:
                if (this.currentSubStep === 1) {
                    currentUIAState.eva1_power = true;
                    currentDCUState.eva1.batt = true;  // Set to umbilical
                    print("[IngressSimulator] Step 1.1: Setting eva1_power and batt to true");
                }
                break;

            case 2:
                if (this.currentSubStep === 1) {
                    currentUIAState.oxy_vent = true;
                    print("[IngressSimulator] Step 2.1: Setting oxy_vent to true");
                } else if (this.currentSubStep === 2) {
                    // Simulate tanks draining
                    currentTelemetryState.eva1.oxy_pri_storage = 5;
                    currentTelemetryState.eva1.oxy_sec_storage = 5;
                    print("[IngressSimulator] Step 2.2: Setting oxygen levels to 5");
                } else if (this.currentSubStep === 3) {
                    currentUIAState.oxy_vent = false;
                    print("[IngressSimulator] Step 2.3: Setting oxy_vent to false");
                }
                break;

            case 3:
                if (this.currentSubStep === 1) {
                    currentDCUState.eva1.pump = true;
                    print("[IngressSimulator] Step 3.1: Setting pump to true");
                } else if (this.currentSubStep === 2) {
                    currentUIAState.eva1_water_waste = true;
                    print("[IngressSimulator] Step 3.2: Setting eva1_water_waste to true");
                } else if (this.currentSubStep === 3) {
                    // Simulate coolant draining
                    currentTelemetryState.eva1.coolant_ml = 2;
                    print("[IngressSimulator] Step 3.3: Setting coolant to 2ml");
                } else if (this.currentSubStep === 4) {
                    currentUIAState.eva1_water_waste = false;
                    print("[IngressSimulator] Step 3.4: Setting eva1_water_waste to false");
                }
                break;

            case 4:
                if (this.currentSubStep === 1) {
                    currentUIAState.eva1_power = false;
                    print("[IngressSimulator] Step 4.1: Setting eva1_power to false");
                } else if (this.currentSubStep === 2) {
                    currentDCUState.eva1.batt = false;  // Set back to local battery
                    print("[IngressSimulator] Step 4.2: Setting batt to false (local)");
                }
                break;
        }

        // Update TSS data with new states
        print("[IngressSimulator] Updating all TSS states");
        this.tssData.onUIAUpdate(JSON.stringify({ uia: currentUIAState }));
        this.tssData.onDCUUpdate(JSON.stringify({ dcu: currentDCUState }));
        this.tssData.onTELEMETRYUpdate(JSON.stringify({ telemetry: currentTelemetryState }));
    }
} 