---
title: Neural Network Playground
emoji: 🧠
colorFrom: pink
colorTo: blue
sdk: static
pinned: true
license: mit
---

# Neural Network Playground

![Neural Network Playground](https://raw.githubusercontent.com/huggingface/hub-docs/main/static/logos/huggingface_logo-noborder.svg)

## Introduction

Neural Network Playground is an interactive visualization tool that helps you understand how neural networks work. Built with plain HTML, CSS, and JavaScript, it allows you to:

- Create custom neural network architectures by dragging and dropping different types of layers
- Connect layers and see how data flows through the network
- View input and output shapes for each layer
- Visualize layer parameters and configurations

## Features

- **Interactive Interface**: Drag and drop nodes to create neural networks
- **Shape Information**: See input and output shapes for each node
- **Detailed Parameters**: View kernel size, stride, and padding for applicable layers
- **Layer Types**:
  - Input Layer
  - Hidden Layer
  - Output Layer
  - Convolutional Layer
  - Pooling Layer
  - Linear Regression Layer

## How to Use

1. Drag components from the left panel onto the canvas
2. Connect them by dragging from output (right) ports to input (left) ports
3. Double-click on nodes to edit their properties
4. Use the network settings to adjust learning rate and activation functions

## Technical Details

The playground visualizes how neural networks process data and helps users understand concepts like:

- Shape transformations between layers
- Parameter calculations
- The effects of different layer configurations

This is an educational tool designed to make neural networks more accessible and understandable.

## License

MIT
