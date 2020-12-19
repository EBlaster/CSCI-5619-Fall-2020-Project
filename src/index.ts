/* CSCI 5619 Assignment 6, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Space, Color4, Plane } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController/webXRControllercomponent";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { WebXRSessionManager } from "@babylonjs/core/XR/webXRSessionManager";
import { PointerEventTypes, PointerInfo } from "@babylonjs/core/Events/pointerEvents";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Logger } from "@babylonjs/core/Misc/logger";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { CubeTexture } from "@babylonjs/core/Materials/Textures/cubeTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import { Mesh } from "@babylonjs/core/Meshes/Mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Axis } from "@babylonjs/core/Maths/math.axis";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { AssetsManager } from "@babylonjs/core/Misc";
import { Animation } from "@babylonjs/core/Animations/animation";
import { HighlightLayer } from "@babylonjs/core";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { Control } from "@babylonjs/gui/2D/controls";
import { Button3D } from "@babylonjs/gui/3D/controls/button3D"
import { ColorPicker } from "@babylonjs/gui/2D/controls/colorpicker"
import { StackPanel } from "@babylonjs/gui/2D/controls/stackPanel"
import { Checkbox } from "@babylonjs/gui/2D/controls/checkbox"
import { Slider } from "@babylonjs/gui/2D/controls/sliders/slider"
import { RadioButton } from "@babylonjs/gui/2D/controls/radioButton"
import { HolographicButton } from "@babylonjs/gui/3D/controls/holographicButton"
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { StackPanel3D } from "@babylonjs/gui/3D/controls/stackPanel3D"
import { PlanePanel } from "@babylonjs/gui/3D/controls/planePanel"
import { CylinderPanel } from "@babylonjs/gui/3D/controls/cylinderPanel"

// Side effects
import "@babylonjs/loaders/glTF/2.0/glTFLoader"
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/inspector";

enum LocomotionMode {
  viewDirected,
  handDirected,
  teleportation,
  visualizedTele
}

class Game {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;

  private xrCamera: WebXRCamera | null;
  private xrSessionManager: WebXRSessionManager | null;
  private leftController: WebXRInputSource | null;
  private rightController: WebXRInputSource | null;

  private locomotionMode: LocomotionMode;
  private flyMode: boolean;
  private turned: boolean;

  private groundMeshes: Array<AbstractMesh>;
  private teleportPoint: Vector3 | null;
  private teleportBox: Mesh | null;
  private workspaceBox: Mesh | null;
  private workspaceUser: Mesh | null;

  private movement: Animation | null;
  private frameCount: number;
  private keyFrames: any[];

  private highlight: HighlightLayer;
  private picker: ColorPicker | null;
  private pickerPlane: Mesh | null;
  private selectedMesh: Mesh | null;
  private selectedInstancedMesh: InstancedMesh | null;
  private selectedMaterial: StandardMaterial | null;

  private configurableMesh: Mesh | null;
  private moveSpeed: number;

  // Anlan 12122020
  private world: Mesh | null;
  private worldOriginalPosition: Vector3;
  private cameraOriginalPosition: Vector3;
  private mapMode: boolean;
  private originalLocomotionMode: LocomotionMode;
  private originalFlyMode: boolean;

  constructor() {
    // Get the canvas element
    this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

    // Generate the BABYLON 3D engine
    this.engine = new Engine(this.canvas, true);

    // Creates a basic Babylon Scene object
    this.scene = new Scene(this.engine);

    this.xrCamera = null;
    this.xrSessionManager = null;
    this.leftController = null;
    this.rightController = null;

    this.locomotionMode = LocomotionMode.viewDirected;
    this.flyMode = false;
    this.turned = false;

    this.groundMeshes = [];
    this.teleportPoint = null;
    this.teleportBox = null;
    this.workspaceBox = null;
    this.workspaceUser = null;

    this.movement = null;
    this.frameCount = 0;
    this.keyFrames = [];

    this.highlight = new HighlightLayer("highlight", this.scene);
    this.picker = null;
    this.pickerPlane = null;
    this.selectedMesh = null;
    this.selectedInstancedMesh = null;
    this.selectedMaterial = null;
    this.configurableMesh = null;
    this.moveSpeed = 3;

    // Anlan 12122020
    this.world = null;
    this.worldOriginalPosition = new Vector3(0, .01, 0);
    this.cameraOriginalPosition = new Vector3(0, 1.6, 0);
    this.mapMode = false;
    this.originalLocomotionMode = this.locomotionMode;
    this.originalFlyMode = this.flyMode;
  }

  start(): void {
    // Create the scene and then execute this function afterwards
    this.createScene().then(() => {

      // Register a render loop to repeatedly render the scene
      this.engine.runRenderLoop(() => {
        this.update();
        this.scene.render();
      });

      // Watch for browser/canvas resize events
      window.addEventListener("resize", () => {
        this.engine.resize();
      });
    });
  }

  private async createScene() {
    // This creates and positions a first-person camera (non-mesh)
    var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
    camera.fov = 90 * Math.PI / 180;
    camera.minZ = .1;
    camera.maxZ = 1000;

    // This attaches the camera to the canvas
    camera.attachControl(this.canvas, true);

    // Create a directional light
    var directionalLight = new DirectionalLight("directionalLight",
      new Vector3(-60, -120, 100), this.scene);
    directionalLight.intensity = 8;
    directionalLight.diffuse = new Color3(.25, .25, .25);

    var hemisphericLight = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this.scene);
    hemisphericLight.intensity = 1;

    // Creates a default skybox
    const environment = this.scene.createDefaultEnvironment({
      createGround: true,
      groundSize: 500,
      skyboxSize: 600
    });

    // Creates a skybox
    var skyboxDayMaterial = new StandardMaterial("skyboxDay", this.scene);
    skyboxDayMaterial.backFaceCulling = false;
    skyboxDayMaterial.reflectionTexture = new CubeTexture("assets/textures/skybox", this.scene);
    skyboxDayMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxDayMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxDayMaterial.specularColor = new Color3(0, 0, 0);

    var skyboxNightMaterial = new StandardMaterial("skyboxNight", this.scene);
    skyboxNightMaterial.backFaceCulling = false;
    skyboxNightMaterial.reflectionTexture = new CubeTexture("assets/textures/skybox2", this.scene);
    skyboxNightMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxNightMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxNightMaterial.specularColor = new Color3(0, 0, 0);

    environment!.skybox!.material = skyboxDayMaterial;

    var groundMaterial = new StandardMaterial("ground", this.scene);
    groundMaterial.diffuseColor = new Color3(0, 0, 0);
    groundMaterial.specularColor = new Color3(0, 0, 0);
    groundMaterial.emissiveColor = new Color3(.39, .5, .3);
    environment!.ground!.material = groundMaterial;

    // Make sure the skybox is not pickable!
    environment!.skybox!.isPickable = false;

    // Creates the XR experience helper
    const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

    // Register event handler for selection events (pulling the trigger, clicking the mouse button)
    this.scene.onPointerObservable.add((pointerInfo) => {
      this.processPointer(pointerInfo);
    });

    // Assigns the web XR camera and session manager to member variables
    this.xrCamera = xrHelper.baseExperience.camera;
    this.xrCamera.position = new Vector3(-7, this.xrCamera!.realWorldHeight, 0);
    this.xrSessionManager = xrHelper.baseExperience.sessionManager;

    // Remove default teleportation and pointer selection
    xrHelper.teleportation.dispose();

    // Create points for the laser pointer
    var laserPoints = [];
    laserPoints.push(new Vector3(0, 0, 0));
    laserPoints.push(new Vector3(0, 0, 1));

    const earcut = require('earcut');
    (window as any).earcut = earcut;
    this.teleportBox = MeshBuilder.ExtrudePolygon("teleportBox",
      {
        shape: [new Vector3(-.4, .2, 0), new Vector3(0, .2, -.4),
        new Vector3(.4, .2, 0), new Vector3(0, .2, .8)], depth: .2
      }, this.scene);
    this.teleportBox.visibility = 0;
    this.teleportBox.isPickable = false;
    var teleportBoxMaterial = new StandardMaterial("teleportBox", this.scene);
    teleportBoxMaterial.alpha = .3;
    teleportBoxMaterial.emissiveColor = new Color3(0, 1, 0);
    this.teleportBox.material = teleportBoxMaterial;

    this.workspaceUser = MeshBuilder.ExtrudePolygon("workspaceUser",
      {
        shape: [new Vector3(-.4, .2, 0), new Vector3(0, .2, -.4),
        new Vector3(.4, .2, 0), new Vector3(0, .2, .8)], depth: .2
      }, this.scene);
    this.workspaceUser.visibility = 0;
    this.workspaceUser.isPickable = false;
    var workspaceUserMaterial = new StandardMaterial("workspaceUser", this.scene);
    workspaceUserMaterial.alpha = .7;
    workspaceUserMaterial.emissiveColor = new Color3(1, .5, 0);
    this.workspaceUser.material = workspaceUserMaterial;

    this.workspaceBox = MeshBuilder.CreateBox("workspace", { size: 3 }, this.scene);
    this.workspaceBox.visibility = 0;
    this.workspaceBox.isPickable = false;
    var workspaceBoxMaterial = new StandardMaterial("workspace", this.scene);
    workspaceBoxMaterial.alpha = .2;
    workspaceBoxMaterial.emissiveColor = new Color3(0, 1, 0);
    this.workspaceBox.material = workspaceBoxMaterial;

    var assetsManager = new AssetsManager(this.scene);

    // Create a task for each asset you want to load
    var worldTask = assetsManager.addMeshTask("world task", "", "assets/models/", "town.glb");
    worldTask.onSuccess = (task) => {
      worldTask.loadedMeshes[0].name = "world";
      worldTask.loadedMeshes[0].rotation = new Vector3(0, 0, 0);
      worldTask.loadedMeshes[0].position = new Vector3(0, .01, 0);
    }

    // This loads all the assets and displays a loading screen
    assetsManager.load();

    // This will execute when all assets are loaded
    assetsManager.onFinish = (tasks) => {
      // Add the floor meshes to the teleporter
      worldTask.loadedMeshes.forEach((mesh) => {
        if (mesh.name.includes("road") ||
          mesh.name.includes("grass") ||
          mesh.name.includes("sidewalk") ||
          mesh.name.includes("street")) {
          this.groundMeshes.push(mesh);
          xrHelper.teleportation.addFloorMesh(mesh);
        }
        // Anlan 12122020
        if(mesh.name == "world"){
          this.world = <Mesh>mesh;
          environment!.ground!.setParent(this.world);
        }
      });

      // Show the debug layer
      this.scene.debugLayer.show();
    };

    // The manager automates some of the GUI creation steps
    var guiManager = new GUI3DManager(this.scene);

    var controllerGuiTransform = new TransformNode("controllerGuiTransform", this.scene);
    controllerGuiTransform.position = new Vector3(-.1, -.1, -.3);
    controllerGuiTransform.rotation = new Vector3(Math.PI * .3, Math.PI * .5, 0);

    // Create a night mode button
    var nightModeButton = new Button3D("nightModeButton");
    guiManager.addControl(nightModeButton);
    nightModeButton.scaling = new Vector3(.1, .05, .1);

    var nightModeButtonTransform = new TransformNode("nightModeButtonTransform", this.scene);
    nightModeButtonTransform.position = new Vector3(0, 0, 0);
    nightModeButtonTransform.parent = controllerGuiTransform;
    nightModeButton.linkToTransformNode(nightModeButtonTransform);

    // Create the night mode button text
    var nightModeButtonText = new TextBlock();
    nightModeButtonText.text = "Night Mode";
    nightModeButtonText.color = "white";
    nightModeButtonText.fontSize = 12;
    nightModeButtonText.scaleX = 2;
    nightModeButtonText.scaleY = 4;
    nightModeButtonText.rotation = Math.PI;
    nightModeButton.content = nightModeButtonText;

    // Type cast the button material so we can change the color
    var buttonMaterial = <StandardMaterial>nightModeButton.mesh!.material;

    var backgroundColorDay = new Color3(1, 1, 200 / 255);
    var backgroundColorNight = new Color3(120 / 255, 100 / 255, 120 / 255);
    var hoverColorDay = new Color3(200 / 255, 200 / 255, 160 / 255);
    var hoverColorNight = new Color3(170 / 255, 150 / 255, 170 / 255);
    // Custom background color
    buttonMaterial.diffuseColor = backgroundColorDay;
    nightModeButton.pointerOutAnimation = () => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = backgroundColorDay;
      } else {
        buttonMaterial.diffuseColor = backgroundColorNight;
      }
    }
    // Custom hover color
    nightModeButton.pointerEnterAnimation = () => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = hoverColorDay;
      } else {
        buttonMaterial.diffuseColor = hoverColorNight;
      }
    }
    // Change the mode when button is pressed
    nightModeButton.onPointerDownObservable.add(() => {
      if (nightModeButtonText.text == "Night Mode") {
        buttonMaterial.diffuseColor = hoverColorNight;
        environment!.skybox!.material = skyboxNightMaterial;
        hemisphericLight.intensity = 0;
        directionalLight.intensity = 0;
        nightModeButtonText.text = "Day Mode"
      } else {
        buttonMaterial.diffuseColor = hoverColorDay;
        environment!.skybox!.material = skyboxDayMaterial;
        hemisphericLight.intensity = 1;
        directionalLight.intensity = 8;
        nightModeButtonText.text = "Night Mode"
      }
    });

    // Create a map mode button
    var mapModeButton = new Button3D("mapModeButton");
    guiManager.addControl(mapModeButton);
    mapModeButton.scaling = new Vector3(.1, .05, .1);

    var mapModeButtonTransform = new TransformNode("mapModeButtonTransform", this.scene);
    mapModeButtonTransform.position = new Vector3(0, -.12, 0);
    mapModeButtonTransform.parent = controllerGuiTransform;
    mapModeButton.linkToTransformNode(mapModeButtonTransform);

    var mapModeButtonText = new TextBlock();
    mapModeButtonText.text = "Map Mode";
    mapModeButtonText.color = "white";
    mapModeButtonText.fontSize = 12;
    mapModeButtonText.scaleX = 2;
    mapModeButtonText.scaleY = 4;
    mapModeButtonText.rotation = Math.PI;
    mapModeButton.content = mapModeButtonText;

    // Create a locomotion mode button
    var locoModeButton = new Button3D("locoModeButton");
    guiManager.addControl(locoModeButton);
    locoModeButton.scaling = new Vector3(.1, .05, .1);

    var locoModeButtonTransform = new TransformNode("locoModeButtonTransform", this.scene);
    locoModeButtonTransform.position = new Vector3(0, -.06, 0);
    locoModeButtonTransform.parent = controllerGuiTransform;
    locoModeButton.linkToTransformNode(locoModeButtonTransform);

    var locoModeButtonText = new TextBlock();
    locoModeButtonText.text = "Locomotion Mode";
    locoModeButtonText.color = "white";
    locoModeButtonText.fontSize = 12;
    locoModeButtonText.scaleX = 2;
    locoModeButtonText.scaleY = 4;
    locoModeButtonText.rotation = Math.PI;
    locoModeButton.content = locoModeButtonText;

    var configPlane = MeshBuilder.CreatePlane("configPlane",
      { width: 0.26, height: 0.23 }, this.scene);
    var configPlaneTransform = new TransformNode("configPlaneTransform");
    configPlaneTransform.position = new Vector3(0, -.25, 0);
    configPlaneTransform.rotation = new Vector3(150 * Math.PI / 180, Math.PI, 0);
    configPlane.parent = configPlaneTransform;
    configPlaneTransform.parent = controllerGuiTransform;
    configPlane.isVisible = false;

    var configTexture = AdvancedDynamicTexture.CreateForMesh(configPlane, 260, 230);
    configTexture.background = (new Color4(.5, .5, .5, .75)).toHexString();

    // Create a stack panel for the radio buttons
    var locoModePanel = new StackPanel("locoModePanel");
    locoModePanel.widthInPixels = 250;
    locoModePanel.isVertical = true;
    locoModePanel.paddingLeftInPixels = 10;
    locoModePanel.paddingTopInPixels = 10;
    locoModePanel.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
    locoModePanel.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;

    configTexture.addControl(locoModePanel);

    var locoModeRadio1 = new RadioButton("locoModeRadio1");
    locoModeRadio1.isChecked = true;
    locoModeRadio1.width = "20px";
    locoModeRadio1.height = "20px";
    locoModeRadio1.color = "white";
    locoModeRadio1.background = "black";

    var locoModeRadio2 = new RadioButton("locoModeRadio2");
    locoModeRadio2.width = "20px";
    locoModeRadio2.height = "20px";
    locoModeRadio2.color = "white";
    locoModeRadio2.background = "black";

    var locoModeRadio3 = new RadioButton("locoModeRadio3");
    locoModeRadio3.width = "20px";
    locoModeRadio3.height = "20px";
    locoModeRadio3.color = "white";
    locoModeRadio3.background = "black";

    var locoModeRadio4 = new RadioButton("locoModeRadio4");
    locoModeRadio4.width = "20px";
    locoModeRadio4.height = "20px";
    locoModeRadio4.color = "white";
    locoModeRadio4.background = "black";

    var flyModeCheckbox = new Checkbox("flyModeCheckbox");
    flyModeCheckbox.width = "20px";
    flyModeCheckbox.height = "20px";
    flyModeCheckbox.color = "white";
    flyModeCheckbox.background = "black";
    flyModeCheckbox.isChecked = false;

    var moveSpeedSlider = new Slider("moveSpeedSlider");
    moveSpeedSlider.width = "240px";
    moveSpeedSlider.height = "24px";
    moveSpeedSlider.color = "white";
    moveSpeedSlider.background = "black";
    moveSpeedSlider.minimum = .5;
    moveSpeedSlider.maximum = 10;
    moveSpeedSlider.value = this.moveSpeed;
    moveSpeedSlider.paddingTopInPixels = 5;

    // Text headers for the radio buttons
    var locoModeRadio1Header = Control.AddHeader(locoModeRadio1, "View directed move", "230px", {isHorizontal: true, controlFirst: true});
    locoModeRadio1Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio1Header.height = "30px";
    locoModeRadio1Header.fontSize = "20px";
    locoModeRadio1Header.color = "white";
    locoModePanel.addControl(locoModeRadio1Header);

    var locoModeRadio2Header = Control.AddHeader(locoModeRadio2, "Hand directed move", "230px", {isHorizontal: true, controlFirst: true});
    locoModeRadio2Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio2Header.height = "30px";
    locoModeRadio2Header.fontSize = "20px";
    locoModeRadio2Header.color = "white";
    locoModePanel.addControl(locoModeRadio2Header);

    var locoModeRadio3Header = Control.AddHeader(locoModeRadio3, "Directed teleportation", "230px", {isHorizontal: true, controlFirst: true});
    locoModeRadio3Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio3Header.height = "30px";
    locoModeRadio3Header.fontSize = "20px";
    locoModeRadio3Header.color = "white";
    locoModePanel.addControl(locoModeRadio3Header);

    var locoModeRadio4Header = Control.AddHeader(locoModeRadio4, "Visualized teleportation", "230px", {isHorizontal: true, controlFirst: true});
    locoModeRadio4Header.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    locoModeRadio4Header.height = "30px";
    locoModeRadio4Header.fontSize = "20px";
    locoModeRadio4Header.color = "white";
    locoModePanel.addControl(locoModeRadio4Header);

    var flyModeCheckboxHeader = Control.AddHeader(flyModeCheckbox, "Fly mode", "230px", {isHorizontal: true, controlFirst: true});
    flyModeCheckboxHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    flyModeCheckboxHeader.height = "30px";
    flyModeCheckboxHeader.fontSize = "20px";
    flyModeCheckboxHeader.color = "white";
    locoModePanel.addControl(flyModeCheckboxHeader);

    var moveSpeedSliderHeader = Control.AddHeader(moveSpeedSlider, "Move speed: " + this.moveSpeed.toFixed(1).toString() + "m/s", "28px", {isHorizontal: false, controlFirst: false});
    moveSpeedSliderHeader.horizontalAlignment = StackPanel.HORIZONTAL_ALIGNMENT_LEFT;
    moveSpeedSliderHeader.verticalAlignment = StackPanel.VERTICAL_ALIGNMENT_TOP;
    moveSpeedSliderHeader.paddingTopInPixels = 5;
    moveSpeedSliderHeader.fontSize = "20px";
    moveSpeedSliderHeader.color = "white";
    var text = <TextBlock>moveSpeedSliderHeader.getChildByName("header");
    text.paddingLeftInPixels = 15;
    locoModePanel.addControl(moveSpeedSliderHeader);

    var openedConfigPlane = false;
    locoModeButton.onPointerDownObservable.add(() => {
      if (openedConfigPlane) {
        configPlane.isVisible = false;
      } else {
        configPlane.isVisible = true;
      }
      openedConfigPlane = !openedConfigPlane;
    });

    // Event handlers for the radio buttons
    locoModeRadio1.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 0;
      }
    });

    locoModeRadio2.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 1;
      }
    });

    locoModeRadio3.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 2;
      }
    });

    locoModeRadio4.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.locomotionMode = 3;
      }
    });

    flyModeCheckbox.onIsCheckedChangedObservable.add((state) => {
      if (state) {
        this.flyMode = true;
      } else {
        this.flyMode = false;
      }
    });

    // Anlan 12122020
    mapModeButton.onPointerDownObservable.add(() => {
      if(this.mapMode == true) {
        // resume the original position
        this.world!.position.x = this.worldOriginalPosition.x;
        this.world!.position.y = this.worldOriginalPosition.y;
        this.world!.position.z = this.worldOriginalPosition.z;
        this.xrCamera!.position.x = this.cameraOriginalPosition.x;
        this.xrCamera!.position.y = this.cameraOriginalPosition.y;
        this.xrCamera!.position.z = this.cameraOriginalPosition.z;

        // resume original fly mode and locomotion mode
        this.flyMode = this.originalFlyMode;
        this.locomotionMode = this.originalLocomotionMode;

        this.mapMode = false;
      } else {
        // save the original position
        this.worldOriginalPosition.x = this.world!.position.x;
        this.worldOriginalPosition.y = this.world!.position.y;
        this.worldOriginalPosition.z = this.world!.position.z;
        this.cameraOriginalPosition.x = this.xrCamera!.position.x;
        this.cameraOriginalPosition.y = this.xrCamera!.position.y;
        this.cameraOriginalPosition.z = this.xrCamera!.position.z;
        this.world!.position.y -= 20;

        // save original fly and locomotion mode, set fly mode as true and set locomotion mode as visualizedtele
        this.originalLocomotionMode = this.locomotionMode;
        this.originalFlyMode = this.flyMode;
        this.flyMode = true;
        this.locomotionMode = LocomotionMode.visualizedTele;

        this.mapMode = true;
      }
    });

    moveSpeedSlider.onValueChangedObservable.add((value) => {
      var text = <TextBlock>moveSpeedSliderHeader.getChildByName("header");
      this.moveSpeed = value;
      text.text = "Move speed: " + this.moveSpeed.toFixed(1).toString() + "m/s", "230px";
    });

    // Create a colorpicker
    this.picker = new ColorPicker();
    this.pickerPlane = MeshBuilder.CreatePlane(
      "pickerPlane", { width: .3, height: .3 }, this.scene);
    var pickerTexture = AdvancedDynamicTexture.CreateForMesh(this.pickerPlane, 500, 500);
    pickerTexture.addControl(this.picker);
    var pickerPlaneTransform = new TransformNode("pickerPlaneTransform", this.scene);
    pickerPlaneTransform.position = new Vector3(-.13, -.02, 0);
    pickerPlaneTransform.parent = controllerGuiTransform;
    this.pickerPlane.parent = pickerPlaneTransform;
    this.pickerPlane.isPickable = false;
    this.pickerPlane.visibility = 0;

    this.highlight.addExcludedMesh(this.pickerPlane);
    this.highlight.addExcludedMesh(configPlane);

    // Attach the laser pointer to the right controller when it is connected
    xrHelper.input.onControllerAddedObservable.add((inputSource) => {
      if (inputSource.uniqueId.endsWith("right")) {
        this.rightController = inputSource;
      } else {
        this.leftController = inputSource;
        controllerGuiTransform.parent = this.leftController.pointer!;
      }
    });

    // Don't forget to deparent objects from the controllers or they will be destroyed!
    xrHelper.input.onControllerRemovedObservable.add((inputSource) => {
      if (inputSource.uniqueId.endsWith("left")) {
        controllerGuiTransform.parent = null;
      }
    });
  }

  private processPointer(pointerInfo: PointerInfo) {
    const that = this;
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        if (pointerInfo.pickInfo?.hit) {
          console.log("selected mesh: " + pointerInfo.pickInfo.pickedMesh?.name);
          if (pointerInfo.pickInfo.pickedMesh?.name.includes("picker")) {
            console.log("hit plane");
          } else if (pointerInfo.pickInfo.pickedMesh?.name.startsWith("sptp") &&
            !(pointerInfo.pickInfo.pickedMesh?.name.includes("concrete") ||
              pointerInfo.pickInfo.pickedMesh?.name.includes("segment") ||
              pointerInfo.pickInfo.pickedMesh?.name.includes("grass"))) {
            this.selectedInstancedMesh = null;
            this.selectedMesh = null;
            this.selectedMaterial = null;
            this.highlight.removeAllMeshes();
            this.pickerPlane!.visibility = 1;
            this.pickerPlane!.isPickable = true;
            this.picker!.onValueChangedObservable.clear();
            if (pointerInfo!.pickInfo!.pickedMesh instanceof InstancedMesh) {
              this.selectedInstancedMesh = <InstancedMesh>pointerInfo.pickInfo.pickedMesh;
              this.selectedMaterial = <StandardMaterial>this.selectedInstancedMesh.sourceMesh.material!.clone("selectedMaterial");
              console.log("instanced. material: " + this.selectedMaterial!.emissiveColor);
              this.highlight.addMesh(this.selectedInstancedMesh.sourceMesh, Color3.White());
              this.picker!.value = this.selectedMaterial.emissiveColor;
              this.picker!.onValueChangedObservable.add(function(color) {
                that.selectedMaterial!.emissiveColor.copyFrom(color);
                that.selectedInstancedMesh!.sourceMesh.material = that.selectedMaterial;
              });
            } else {
              this.selectedMesh = <Mesh>pointerInfo.pickInfo.pickedMesh;
              this.selectedMaterial = <StandardMaterial>this.selectedMesh.material!.clone("selectedMaterial");
              console.log("mesh. material: " + this.selectedMaterial!.emissiveColor);
              this.highlight.addMesh(this.selectedMesh, Color3.White());
              this.picker!.value = this.selectedMaterial.emissiveColor;
              this.picker!.onValueChangedObservable.add(function(color) {
                that.selectedMaterial!.emissiveColor.copyFrom(color);
                that.selectedMesh!.material = that.selectedMaterial;
              });
            }
          } else {
            this.selectedInstancedMesh = null;
            this.selectedMesh = null;
            this.selectedMaterial = null;
            this.highlight.removeAllMeshes();
            this.pickerPlane!.visibility = 0;
            this.pickerPlane!.isPickable = false;
            this.picker!.onValueChangedObservable.clear();
          }
        }
      break;
    }
  }

  // The main update loop will be executed once per frame before the scene is rendered
  private update(): void {
    // Polling for controller input
    this.processControllerInput();
  }

  // Process event handlers for controller input
  private processControllerInput() {
    this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
    this.onLeftThumbStick(this.leftController?.motionController?.getComponent("xr-standard-thumbstick"));
  }

  private onRightThumbstick(component?: WebXRControllerComponent) {
    if (component?.changes.axes) {
      if (this.mapMode == false) {
        // View-directed steering
        if (this.locomotionMode == LocomotionMode.viewDirected) {
          // Get the current camera direction
          var directionVector = this.xrCamera!.getDirection(Axis.Z);

          if (!this.flyMode) {
            directionVector.y = 0;
            directionVector = directionVector.normalizeToNew();
          }

          // Use delta time to calculate the move distance based on speed of 3 m/sec
        var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * this.moveSpeed;

          // Translate the camera forward
          this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

          // Snap turn
          var turnAngle = 20;
          if (component.axes.x > .8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if (component.axes.x < -.8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, -turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if ((component.axes.x <= .5 && component.axes.x >= -.5) && this.turned) {
            this.turned = false;
          }
        } else if (this.locomotionMode == LocomotionMode.handDirected) {
          // Get the current hand direction
          var directionVector = this.rightController!.pointer.forward;

          if (!this.flyMode) {
            directionVector.y = 0;
            directionVector = directionVector.normalizeToNew();
          }

          // Use delta time to calculate the move distance based on speed of 3 m/sec
        var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * this.moveSpeed;

          // Translate the camera forward
          this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));

          // Snap turn
          var turnAngle = 20;
          if (component.axes.x > .8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if (component.axes.x < -.8 && !this.turned) {
            this.turned = true;
            var cameraRotation = Quaternion.FromEulerAngles(0, -turnAngle * Math.PI / 180, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
          } else if ((component.axes.x <= .5 && component.axes.x >= -.5) && this.turned) {
            this.turned = false;
          }
        } else if (this.locomotionMode == LocomotionMode.teleportation) {  // Teleportation
          // If the thumbstick is moved forward
          if (component.axes.y < -.75) {
            // Create a new ray cast
            var ray = new Ray(this.rightController!.pointer.position,
              this.rightController!.pointer.forward, 20);
            var pickInfo = this.scene.pickWithRay(ray);

            // If the ray cast intersected a ground mesh
            if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
              this.teleportPoint = pickInfo.pickedPoint;
              this.teleportBox!.visibility = 1;
              var rotation = this.xrCamera!.getDirection(Axis.Z);
              rotation.y = 0;
              this.teleportBox!.lookAt(this.teleportBox!.position.add(rotation));
              this.teleportBox!.rotate(Axis.Y,
                -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!);
              this.teleportBox!.position = this.teleportPoint!.add(new Vector3(0, .2, 0));
            } else {
              this.teleportPoint = null;
              this.teleportBox!.visibility = 0;
            }
          } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
            this.teleportBox!.visibility = 0;

            // If we have a valid targer point, then teleport the user
            if (this.teleportPoint) {
              this.xrCamera!.position.x = this.teleportPoint.x;
              this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight;
              this.xrCamera!.position.z = this.teleportPoint.z;
              this.teleportPoint = null;
              var cameraRotation = Quaternion.FromEulerAngles
                (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
              this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
          }
        } else {  // Visualized Teleportation
          // If the thumbstick is moved forward
          if (component.axes.y < -.75) {
            // Create a new ray cast
            var ray = new Ray(this.rightController!.pointer.position,
              this.rightController!.pointer.forward, 20);
            var pickInfo = this.scene.pickWithRay(ray);

            // If the ray cast intersected a ground mesh
            if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
              this.teleportPoint = pickInfo.pickedPoint;
              this.workspaceBox!.visibility = 1;
              this.workspaceUser!.visibility = 1;
              this.workspaceBox!.position = this.teleportPoint!.add(new Vector3(0, 1.5, 0));
              var userPos = this.xrSessionManager!.currentFrame?.
                getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.position;
              this.workspaceUser!.position = this.teleportPoint!.add
                (new Vector3(userPos?.x, .2, userPos?.z));
              var userOri = this.xrSessionManager!.currentFrame?.getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.orientation;
              var userOriVec = new Quaternion(userOri?.x, userOri?.y, userOri?.z, userOri?.w).
                toEulerAngles();
              this.workspaceUser!.rotation = userOriVec.multiply(new Vector3(0, 1, 0));
            } else {
              this.teleportPoint = null;
              this.workspaceBox!.visibility = 0;
              this.workspaceUser!.visibility = 0;
            }
          } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
            this.workspaceBox!.visibility = 0;
            this.workspaceUser!.visibility = 0;

            // If we have a valid targer point, then teleport the user
            if (this.teleportPoint) {
              this.xrCamera!.position.x = this.teleportPoint.x;
              this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight;
              this.xrCamera!.position.z = this.teleportPoint.z;
              this.teleportPoint = null;
              var cameraRotation = Quaternion.FromEulerAngles
                (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
              this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);
            }
          }
        }
      }
      else {
        // Anlan 12122020
        // Visualized Teleportation
        // If the thumbstick is moved forward
        if (component.axes.y < -.75) {
          // Create a new ray cast
          var ray = new Ray(this.rightController!.pointer.position,
            this.rightController!.pointer.forward, 100);
          var pickInfo = this.scene.pickWithRay(ray);

          // If the ray cast intersected a ground mesh
          if (pickInfo?.hit && this.groundMeshes.includes(pickInfo.pickedMesh!)) {
            this.teleportPoint = pickInfo.pickedPoint;
            this.workspaceBox!.visibility = 1;
            this.workspaceUser!.visibility = 1;
            this.workspaceBox!.position = this.teleportPoint!.add(new Vector3(0, 1.5, 0));
            var userPos = this.xrSessionManager!.currentFrame?.
              getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.position;
            this.workspaceUser!.position = this.teleportPoint!.add
              (new Vector3(userPos?.x, .2, userPos?.z));
            var userOri = this.xrSessionManager!.currentFrame?.getViewerPose(this.xrSessionManager!.baseReferenceSpace)?.transform.orientation;
            var userOriVec = new Quaternion(userOri?.x, userOri?.y, userOri?.z, userOri?.w).
              toEulerAngles();
            this.workspaceUser!.rotation = userOriVec.multiply(new Vector3(0, 1, 0));
          } else {
            this.teleportPoint = null;
            this.workspaceBox!.visibility = 0;
            this.workspaceUser!.visibility = 0;
          }
        } else if (component.axes.y == 0) {  // If thumbstick returns to the rest position
          this.workspaceBox!.visibility = 0;
          this.workspaceUser!.visibility = 0;

          // If we have a valid targer point, then teleport the user
          if (this.teleportPoint) {
            this.xrCamera!.position.x = this.teleportPoint.x + this.worldOriginalPosition.x - this.world!.position.x;
            this.xrCamera!.position.y = this.teleportPoint.y + this.xrCamera!.realWorldHeight + this.worldOriginalPosition.y - this.world!.position.y;
            this.xrCamera!.position.z = this.teleportPoint.z + this.worldOriginalPosition.z - this.world!.position.z;
            this.teleportPoint = null;
            var cameraRotation = Quaternion.FromEulerAngles
              (0, -this.rightController?.pointer.rotationQuaternion?.toEulerAngles().z!, 0);
            this.xrCamera!.rotationQuaternion.multiplyInPlace(cameraRotation);

            // resume the original position
            this.world!.position.x = this.worldOriginalPosition.x;
            this.world!.position.y = this.worldOriginalPosition.y;
            this.world!.position.z = this.worldOriginalPosition.z;

            // resume original fly mode and locomotion mode
            this.flyMode = this.originalFlyMode;
            this.locomotionMode = this.originalLocomotionMode;

            // exit map mode
            this.mapMode = false;
          }
        }
      }
    }
  }

  // Anlan 12122020
  // Map Zoom in/out
  private onLeftThumbStick(component?: WebXRControllerComponent) {
    if (component?.changes.axes) {
      if(this.mapMode == true){
        // View-directed steering
        // Get the current camera direction
        var directionVector = this.xrCamera!.getDirection(Axis.Z);

        if (!this.flyMode) {
          directionVector.y = 0;
          directionVector = directionVector.normalizeToNew();
        }

        // Use delta time to calculate the move distance based on speed of 10 m/sec for zoom in/out
        var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 10;

        // Translate the camera forward
        this.xrCamera!.position.addInPlace(directionVector.scale(moveDistance));
      }
    }
  }
}
/******* End of the Game class ******/

// start the game
var game = new Game();
game.start();
