/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : usbd_cdc_if.c
  * @version        : v2.0_Cube
  * @brief          : Usb device for Virtual Com Port.
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2025 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "usbd_cdc_if.h"
extern void process_at_command(const char *at_instruction);
/* USER CODE BEGIN INCLUDE */

/* USER CODE END INCLUDE */

/* Private typedef -----------------------------------------------------------*/
/* Private define ------------------------------------------------------------*/
/* Private macro -------------------------------------------------------------*/

/* USER CODE BEGIN PV */
/* Private variables ---------------------------------------------------------*/

/* USER CODE END PV */

/** @addtogroup STM32_USB_OTG_DEVICE_LIBRARY
  * @brief Usb device library.
  * @{
  */

/** @addtogroup USBD_CDC_IF
  * @{
  */

/** @defgroup USBD_CDC_IF_Private_TypesDefinitions USBD_CDC_IF_Private_TypesDefinitions
  * @brief Private types.
  * @{
  */

/* USER CODE BEGIN PRIVATE_TYPES */

/* USER CODE END PRIVATE_TYPES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Defines USBD_CDC_IF_Private_Defines
  * @brief Private defines.
  * @{
  */

/* USER CODE BEGIN PRIVATE_DEFINES */
/* USER CODE END PRIVATE_DEFINES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Macros USBD_CDC_IF_Private_Macros
  * @brief Private macros.
  * @{
  */

/* USER CODE BEGIN PRIVATE_MACRO */

/* USER CODE END PRIVATE_MACRO */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_Variables USBD_CDC_IF_Private_Variables
  * @brief Private variables.
  * @{
  */
/* Create buffer for reception and transmission           */
/* It's up to user to redefine and/or remove those define */
/** Received data over USB are stored in this buffer      */
uint8_t UserRxBufferFS[APP_RX_DATA_SIZE];

/** Data to send over USB CDC are stored in this buffer   */
uint8_t UserTxBufferFS[APP_TX_DATA_SIZE];

/* USER CODE BEGIN PRIVATE_VARIABLES */

/* USER CODE END PRIVATE_VARIABLES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Exported_Variables USBD_CDC_IF_Exported_Variables
  * @brief Public variables.
  * @{
  */

extern USBD_HandleTypeDef hUsbDeviceFS;

/* USER CODE BEGIN EXPORTED_VARIABLES */

/* USER CODE END EXPORTED_VARIABLES */

/**
  * @}
  */

/** @defgroup USBD_CDC_IF_Private_FunctionPrototypes USBD_CDC_IF_Private_FunctionPrototypes
  * @brief Private functions declaration.
  * @{
  */

static int8_t CDC_Init_FS(void);
static int8_t CDC_DeInit_FS(void);
static int8_t CDC_Control_FS(uint8_t cmd, uint8_t* pbuf, uint16_t length);
static int8_t CDC_Receive_FS(uint8_t* pbuf, uint32_t *Len);

/* USER CODE BEGIN PRIVATE_FUNCTIONS_DECLARATION */

/* USER CODE END PRIVATE_FUNCTIONS_DECLARATION */

/**
  * @}
  */

USBD_CDC_ItfTypeDef USBD_Interface_fops_FS =
{
  CDC_Init_FS,
  CDC_DeInit_FS,
  CDC_Control_FS,
  CDC_Receive_FS
};

/* Private functions ---------------------------------------------------------*/
/**
  * @brief  Initializes the CDC media low layer over the FS USB IP
  * @retval USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_Init_FS(void)
{
  /* USER CODE BEGIN 3 */
  /* Set Application Buffers */
  USBD_CDC_SetTxBuffer(&hUsbDeviceFS, UserTxBufferFS, 0);
  USBD_CDC_SetRxBuffer(&hUsbDeviceFS, UserRxBufferFS);
  return (USBD_OK);
  /* USER CODE END 3 */
}

/**
  * @brief  DeInitializes the CDC media low layer
  * @retval USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_DeInit_FS(void)
{
  /* USER CODE BEGIN 4 */
  return (USBD_OK);
  /* USER CODE END 4 */
}

/**
  * @brief  Manage the CDC class requests
  * @param  cmd: Command code
  * @param  pbuf: Buffer containing command data (request parameters)
  * @param  length: Number of data to be sent (in bytes)
  * @retval Result of the operation: USBD_OK if all operations are OK else USBD_FAIL
  */
static int8_t CDC_Control_FS(uint8_t cmd, uint8_t* pbuf, uint16_t length)
{
  /* USER CODE BEGIN 5 */
  switch(cmd)
  {
    case CDC_SEND_ENCAPSULATED_COMMAND:

    break;

    case CDC_GET_ENCAPSULATED_RESPONSE:

    break;

    case CDC_SET_COMM_FEATURE:

    break;

    case CDC_GET_COMM_FEATURE:

    break;

    case CDC_CLEAR_COMM_FEATURE:

    break;

  /*******************************************************************************/
  /* Line Coding Structure                                                       */
  /*-----------------------------------------------------------------------------*/
  /* Offset | Field       | Size | Value  | Description                          */
  /* 0      | dwDTERate   |   4  | Number |Data terminal rate, in bits per second*/
  /* 4      | bCharFormat |   1  | Number | Stop bits                            */
  /*                                        0 - 1 Stop bit                       */
  /*                                        1 - 1.5 Stop bits                    */
  /*                                        2 - 2 Stop bits                      */
  /* 5      | bParityType |  1   | Number | Parity                               */
  /*                                        0 - None                             */
  /*                                        1 - Odd                              */
  /*                                        2 - Even                             */
  /*                                        3 - Mark                             */
  /*                                        4 - Space                            */
  /* 6      | bDataBits  |   1   | Number Data bits (5, 6, 7, 8 or 16).          */
  /*******************************************************************************/
    case CDC_SET_LINE_CODING:

    break;

    case CDC_GET_LINE_CODING:

    break;

    case CDC_SET_CONTROL_LINE_STATE:

    break;

    case CDC_SEND_BREAK:

    break;

  default:
    break;
  }

  return (USBD_OK);
  /* USER CODE END 5 */
}

/**
  * @brief  Data received over USB OUT endpoint are sent over CDC interface
  *         through this function.
  *
  *         @note
  *         This function will issue a NAK packet on any OUT packet received on
  *         USB endpoint until exiting this function. If you exit this function
  *         before transfer is complete on CDC interface (ie. using DMA controller)
  *         it will result in receiving more data while previous ones are still
  *         not sent.
  *
  * @param  Buf: Buffer of data to be received
  * @param  Len: Number of data received (in bytes)
  * @retval Result of the operation: USBD_OK if all operations are OK else USBD_FAIL
  */
uint8_t toggle_flags;
uint32_t state_flags;
void led_on(void) {
    state_flags = 0xFF << 8;
}

void led_off(void) {
    state_flags = 0xFF << 24;
    toggle_flags = 0;
}

void led_xx_on(uint8_t led_num) {
    if (led_num >= 8 && led_num <= 15)
        state_flags |= 1 << led_num;
}

void led_xx_off(uint8_t led_num) {
    if (led_num >= 8 && led_num <= 15) {
    	state_flags &= ~(1 << led_num);
    	state_flags |= (1 << (led_num +16));
    }
}

void led_xx_toggle(uint8_t led_num) {
    if (led_num >= 8 && led_num <= 15) {
    	state_flags |= (1 << (led_num +16));
        toggle_flags ^= 1 << (led_num - 8);
    }
}

void animation_on(void) {
    state_flags = 0xFF << 24;
}

void animation_off(void) {
}

void send_help(void) {
    uint8_t resp[700];
    int pos = 0;

    resp[pos++] = 0x11;
    resp[pos++] = 0xAA;

    pos += sprintf((char*)&resp[pos],
        "HELP - izpiše seznam vseh ukazov\r\n"
        "LED_ON - prižge vse diode PE08-PE15\r\n"
        "LED_OFF - ugasne vse diode PE08-PE15\r\n"
        "LED_XX_ON - prižge posamezno diodo PE08-PE15\r\n"
        "LED_XX_OFF - ugasne posamezno diodo PE08-PE15\r\n"
        "LED_XX_TOGGLE - izmenično vklaplja/ugasne posamezno diodo\r\n"
        "ANIMATION_ON - sproži animacijo diod\r\n"
        "ANIMATION_OFF - ustavi animacijo\r\n"
        "\r\n");

    resp[pos++] = 0x11;
    resp[pos++] = 0xAA;

    CDC_Transmit_FS(resp, pos);
}





static int8_t CDC_Receive_FS(uint8_t* Buf, uint32_t *Len)
{
    uint8_t *ptr = Buf;
    uint32_t len = *Len;


    if (len < 4) {
        USBD_CDC_ReceivePacket(&hUsbDeviceFS);
        return USBD_OK;
    }

    if (ptr[0] == 0x11 && ptr[1] == 0xAA &&
        ptr[len - 2] == 0x11 && ptr[len - 1] == 0xAA)
    {
        ptr += 2;
        len -= 4;

        if (len == 4) {
            uint32_t num = *(uint32_t*)ptr;
            uint8_t cmd = (num >> 24) & 0xFF;
            uint8_t arg = (num >> 16) & 0xFF;

            if (num == 29464) {
                uint32_t resp = num + 1;
                uint8_t packet[8];
                packet[0] = 0x11; packet[1] = 0xAA;
                memcpy(&packet[2], &resp, 4);
                packet[6] = 0x11; packet[7] = 0xAA;
                CDC_Transmit_FS(packet, 8);
            }
            else {
                switch (cmd) {
                case 0x01: led_on(); break;
                case 0x02: led_off(); break;
                case 0x03: led_xx_on(arg); break;
                case 0x04: led_xx_off(arg); break;
                case 0x05: led_xx_toggle(arg); break;
                case 0x06: animation_on(); break;
                case 0x07: animation_off(); break;
                case 0x08: send_help(); break;


                }
            }
        }
        if (strncmp((char*)ptr, "LED_ON", len) == 0) led_on();
        else if (strncmp((char*)ptr, "LED_OFF", len) == 0) led_off();
        else if (strncmp((char*)ptr, "ANIMATION_ON", len) == 0) animation_on();
        else if (strncmp((char*)ptr, "ANIMATION_OFF", len) == 0) animation_off();

        else if (strncmp((char*)ptr, "LED_", 4) == 0 &&
                 (*(ptr + 4) - '0') * 10 + (*(ptr + 5) - '0') >= 8 &&
                 (*(ptr + 4) - '0') * 10 + (*(ptr + 5) - '0') <= 15)
        {
            int led_num = (*(ptr + 4) - '0') * 10 + (*(ptr + 5) - '0');
            if (strncmp((char*)(ptr + 6), "_ON", 3) == 0)
                led_xx_on(led_num);
            else if (strncmp((char*)(ptr + 6), "_OFF", 4) == 0)
                led_xx_off(led_num);
            else if (strncmp((char*)(ptr + 6), "_TOGGLE", 7) == 0)
                led_xx_toggle(led_num);
        }
        else if (strncmp((char*)ptr, "HELP", len) == 0) send_help();
        else if(strncmp((char*)ptr, "AT_", 3)==0){
        	process_at_command(ptr+3);
        }
    }


USBD_CDC_ReceivePacket(&hUsbDeviceFS);
return USBD_OK;
}

/**
  * @brief  CDC_Transmit_FS
  *         Data to send over USB IN endpoint are sent over CDC interface
  *         through this function.
  *         @note
  *
  *
  * @param  Buf: Buffer of data to be sent
  * @param  Len: Number of data to be sent (in bytes)
  * @retval USBD_OK if all operations are OK else USBD_FAIL or USBD_BUSY
  */

/**
  * @brief  CDC_Transmit_FS
  *         Data to send over USB IN endpoint are sent over CDC interface
  *         through this function.
  *         @note
  *
  *
  * @param  Buf: Buffer of data to be sent
  * @param  Len: Number of data to be sent (in bytes)
  * @retval USBD_OK if all operations are OK else USBD_FAIL or USBD_BUSY
  */
uint8_t CDC_Transmit_FS(uint8_t* Buf, uint16_t Len)
{
  uint8_t result = USBD_OK;
  /* USER CODE BEGIN 7 */
  USBD_CDC_HandleTypeDef *hcdc = (USBD_CDC_HandleTypeDef*)hUsbDeviceFS.pClassData;
  if (hcdc->TxState != 0){
    return USBD_BUSY;
  }
  USBD_CDC_SetTxBuffer(&hUsbDeviceFS, Buf, Len);
  result = USBD_CDC_TransmitPacket(&hUsbDeviceFS);
  /* USER CODE END 7 */
  return result;
}

/* USER CODE BEGIN PRIVATE_FUNCTIONS_IMPLEMENTATION */

/* USER CODE END PRIVATE_FUNCTIONS_IMPLEMENTATION */

/**
  * @}
  */

/**
  * @}
  */
