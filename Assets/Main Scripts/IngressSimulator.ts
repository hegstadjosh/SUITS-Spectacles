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

        // Initialize the simulated TSS data
        this.initializeTSSData();

        // Bind button events
        this.nextButton.onTriggerEnd.add(() => this.nextStep());
        this.prevButton.onTriggerEnd.add(() => this.previousStep());

        // Initialize display
        this.updateDisplay();
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
                    batt: false,
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

        // Initialize the TSS data that will be shared with Ingress.ts
        this.tssData.onUIAUpdate(JSON.stringify(initialUIAData));
        this.tssData.onDCUUpdate(JSON.stringify(initialDCUData));
    }

    private nextStep(): void {
        const currentStepObj = this.steps[this.currentStep];
        const maxSubSteps = Object.keys(currentStepObj).length;

        if (this.currentSubStep < maxSubSteps) {
            this.currentSubStep++;
        } else if (this.currentStep < Object.keys(this.steps).length) {
            this.currentStep++;
            this.currentSubStep = 1;
        }

        this.simulateStepCompletion();
        this.updateDisplay();
    }

    private previousStep(): void {
        if (this.currentSubStep > 1) {
            this.currentSubStep--;
        } else if (this.currentStep > 1) {
            this.currentStep--;
            this.currentSubStep = Object.keys(this.steps[this.currentStep]).length;
        }

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
        const currentUIAState = this.tssData.uia?.uia || {
            eva1_power: false,
            eva1_oxy: false,
            eva1_water_supply: false,
            eva1_water_waste: false,
            oxy_vent: false
        };

        // Update state based on current step
        switch (this.currentStep) {
            case 1:
                if (this.currentSubStep === 1) {
                    currentUIAState.eva1_power = true;
                }
                break;
            case 2:
                if (this.currentSubStep === 1) {
                    currentUIAState.oxy_vent = true;
                } else if (this.currentSubStep === 3) {
                    currentUIAState.oxy_vent = false;
                }
                break;
            case 3:
                if (this.currentSubStep === 2) {
                    currentUIAState.eva1_water_waste = true;
                } else if (this.currentSubStep === 4) {
                    currentUIAState.eva1_water_waste = false;
                }
                break;
            case 4:
                if (this.currentSubStep === 1) {
                    currentUIAState.eva1_power = false;
                }
                break;
        }

        // Update TSS data with new state - this will trigger Ingress.ts to update its scene objects
        this.tssData.onUIAUpdate(JSON.stringify({ uia: currentUIAState }));
    }
} 